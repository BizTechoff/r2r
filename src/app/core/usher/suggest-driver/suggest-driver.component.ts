import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DateColumn, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { currentId } from 'async_hooks';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { driver4UsherSuggest, NOT_FOUND_DAYS, PickupTimePrevHours, TimeColumn, TODAY } from '../../../shared/types';
import { addDays, addHours, daysDiff, resetTime } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { Driver, openDriverRides } from '../../drivers/driver';
import { DriverCall } from '../../drivers/driverCall';
import { RegisterDriver } from '../../drivers/registerDriver';
import { Location, LocationArea, LocationIdColumn, LocationType } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';


@ServerController({ key: 'u/suggest', allowed: [Roles.admin, Roles.usher] })
class usherSuggestDrivers {

  date = new DateColumn();
  fid = new LocationIdColumn(this.context);
  tid = new LocationIdColumn(this.context);
  from = new StringColumn();
  to = new StringColumn();

  locAreas: { border: string, name: string, isBorder: boolean, areaBorders: string[] }[] = [];

  constructor(private context: Context) { }

  @ServerMethod({ allowed: [Roles.admin, Roles.usher] })
  async retrieve() {
    let drivers: driver4UsherSuggest[] = [];
    let priority = 0;//1 is the most importent

    let bAreaAll: { lid: string }[] = [];
    // prepare area & locIds
    let areasBorders: { area: LocationArea, lids: string[] }[] = [];

    console.time('0');

    for await (const loc of this.context.for(Location).iterate({})) {
      if (loc.id.value === this.fid.value) {
        this.from.value = loc.name.value;
      }
      else if (loc.id.value === this.tid.value) {
        this.to.value = loc.name.value;
      }

      if (loc.type.value === LocationType.border) {
        if (loc.area.value === LocationArea.all) {
          bAreaAll.push({ lid: loc.id.value });
        }
        let a: { area: LocationArea, lids: string[] } =
          areasBorders.find(cur => cur.area === loc.area.value);
        if (!(a)) {
          a = { area: loc.area.value, lids: [] };
          areasBorders.push(a);
        }
        a.lids.push(loc.id.value);
      }
    }

    // prepare border & border-area, b>{area(b)} | h>{h}
    this.locAreas = [];// {border->{border.area.lids}}, {hospital->hospital}
    for await (const loc of this.context.for(Location).iterate({
    })) {
      let f = areasBorders.find(cur => cur.area === loc.area.value && loc.type.value === LocationType.border);
      let row = {
        border: loc.id.value,
        name: loc.name.value,
        isBorder: loc.type.value === LocationType.border,
        areaBorders: f ? f.lids : [loc.id.value]
      };
      this.locAreas.push(row);
    }

    if (bAreaAll.length > 0) {
      console.log(`Locations contains ${bAreaAll.length} borders with area 'all'`);
      let all = bAreaAll.map(cur => cur.lid);
      for (const la of this.locAreas) {
        if (la.isBorder) {
          la.areaBorders.push(...all);
        }
      }
    }

    this.distinct(drivers,
      (await this.driversWithSameLineToday(++priority, 'has same ride - at current date')));

    this.distinct(drivers,
      (await this.driversRegisteredSameLineToday(++priority, 'register to line - at current date')));

    this.distinct(drivers,
      (await this.driversRegisteredSameAreaToday(++priority, 'register to area - at current date')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameLineButNoRideForLast5days(++priority, 'done same line - no ride last 5 days')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameAreaButNoRideForLast5days(++priority, 'done same area - no ride last 5 days')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameArea60daysAgoButNoRideForLast7days(++priority, 'done same area last 60 days - no ride last 7 days')));

    this.distinct(drivers,
      (await this.driversNoRideForLast7days(++priority, 'no ride last 7 days')));

    // this.distinct(drivers,
    //   (await this.driversFreezed(++priority, 'no ride last 7 days')));

    drivers.sort((d1, d2) => // sort by: priority, lastRideDays, lastCallDays, freeSeats
      d1.priority - d2.priority === 0 /*same*/
        ? d1.lastRideDays - d2.lastRideDays === 0 /*same*/
          ? d1.lastCallDays - d2.lastCallDays == 0 /*same*/
            ? d1.freeSeats - d2.freeSeats // default compare
            : d1.lastCallDays - d2.lastCallDays // default compare
          : d1.lastRideDays - d2.lastRideDays // default compare
        : d1.priority - d2.priority); // default compare

    return drivers;
  }

  private async driversWithSameLineToday(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];
    let dids: { did: string, taken: number }[] = [];
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.date.isEqualTo(this.date)
        .and(cur.fid.isEqualTo(this.fid))
        .and(cur.tid.isEqualTo(this.tid))
        .and(cur.status.isIn(RideStatus.w4_Start))
        .and(cur.did.isDifferentFrom(''))
    })) {
      let f = dids.find(cur => cur.did === r.did.value);
      if (!(f)) {
        f = { did: r.did.value, taken: 0 };
        dids.push(f);
      }
      f.taken += r.passengers();
    }

    if (dids.length > 0) {
      for (const itm of dids) {
        let row = await this.createDriverRow(
          priority,
          itm.did,
          reason);
        // no free-seats, no relevent
        if (row.seats - itm.taken > 0) {
          // console.log('row.seats=' + row.seats);
          // console.log('itm.taken=' + itm.taken);
          row.freeSeats = row.seats - itm.taken;
          drivers.push(row);
        }
      }
    }
    return drivers;
  }

  private async driversRegisteredSameLineToday(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rd of this.context.for(RegisterDriver).iterate({
      where: cur => cur.date.isEqualTo(this.date)
    })) {

      if (rd.rid.value) {
        let r = await this.context.for(Ride).findId(rd.rid);
        if (r) {
          //if(ride.status.value == RideStatus.waitingForDriver)//look only for line-details
          if (r.fid.value === this.fid.value && r.tid.value === this.tid.value) {
            if (r.pickupTime.value && (!(r.pickupTime.value === TimeColumn.Empty))) {
              if (rd.fh.value <= r.pickupTime.value && r.pickupTime.value <= rd.th.value) {//out of interval
                let dRow: driver4UsherSuggest = drivers.find(cur => cur.did === rd.did.value);
                if (!(dRow)) {
                  dRow = await this.createDriverRow(
                    priority,
                    rd.did.value,
                    reason + `(${rd.fh.value}-${rd.th.value})`);
                  drivers.push(dRow);
                }
                dRow.freeSeats -= r.passengers();
              }
            } else {// create if no pickup-time
              let dRow: driver4UsherSuggest = drivers.find(cur => cur.did === rd.did.value);
              if (!(dRow)) {
                dRow = await this.createDriverRow(
                  priority,
                  rd.did.value,
                  reason + `(${rd.fh.value}-${rd.th.value})`);
                drivers.push(dRow);
              }
              dRow.freeSeats -= r.passengers();
            }
          }
        }
      }

      else if (rd.rrid.value) {
        let rr = await this.context.for(RegisterRide).findId(rd.rrid);
        if (rr) {
          if (rr.fid.value === this.fid.value && rr.tid.value === this.tid.value) {
            let pickupTime = '';
            if (rr.visitTime.value && (!(rr.visitTime.value === TimeColumn.Empty))) {
              pickupTime = addHours(PickupTimePrevHours, rr.visitTime.value);
            }
            if (pickupTime.length > 0) {
              if (rd.fh.value <= pickupTime && pickupTime <= rd.th.value) {//out of interval
                let dRow = drivers.find(cur => cur.did === rd.did.value);
                if (!(dRow)) {
                  dRow = await this.createDriverRow(
                    priority,
                    rd.did.value,
                    reason + `(${rd.fh.value}-${rd.th.value})`);
                  drivers.push(dRow);
                }
                dRow.freeSeats -= rd.seats.value;
              }
            } else {
              let dRow = drivers.find(cur => cur.did === rd.did.value);
              if (!(dRow)) {
                dRow = await this.createDriverRow(
                  priority,
                  rd.did.value,
                  reason + `(${rd.fh.value}-${rd.th.value})`);// `(anytime)`);
                drivers.push(dRow);
              }
              dRow.freeSeats -= rd.seats.value;
            }
          }
        }
        else {
          console.log(`Should not be here (rd.id=${rd.id})`)
        }
      }

    }
    return drivers;
  }

  private async driversRegisteredSameAreaToday(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rd of this.context.for(RegisterDriver).iterate({
      where: cur => cur.date.isEqualTo(this.date)
    })) {
      if (rd.rid.value) {
        let r = await this.context.for(Ride).findId(rd.rid);
        if (r) {
          //if(ride.status.value == RideStatus.waitingForDriver)//look only for line-details
          let fab = this.locAreas.find(cur => cur.border === this.fid.value).areaBorders;
          let tab = this.locAreas.find(cur => cur.border === this.tid.value).areaBorders;
          if (fab.includes(r.fid.value) || tab.includes(r.tid.value)) {// from OR to
            if (r.pickupTime.value && (!(r.pickupTime.value === TimeColumn.Empty))) {
              if (rd.fh.value <= r.pickupTime.value && r.pickupTime.value <= rd.th.value) {//out of interval
                let dRow: driver4UsherSuggest = await this.createDriverRow(
                  priority,
                  rd.did.value,
                  reason);
                dRow.freeSeats = rd.seats.value;
                drivers.push(dRow);
              }
            } else {
              let dRow: driver4UsherSuggest = await this.createDriverRow(
                priority,
                rd.did.value,
                reason);
              dRow.freeSeats = rd.seats.value;
              drivers.push(dRow);
            }
          }
        }
      }
      else if (rd.rrid.value) {
        let rr = await this.context.for(RegisterRide).findId(rd.rrid);
        if (rr) {
          let fab = this.locAreas.find(cur => cur.border === this.fid.value).areaBorders;
          let tab = this.locAreas.find(cur => cur.border === this.tid.value).areaBorders;
          if (fab.includes(rr.fid.value) || tab.includes(rr.tid.value)) {
            let pickupTime = '';
            if (rr.visitTime.value && (!(rr.visitTime.value === TimeColumn.Empty))) {
              pickupTime = addHours(PickupTimePrevHours, rr.visitTime.value);
            }
            if (pickupTime.length > 0) {
              if (rd.fh.value <= pickupTime && pickupTime <= rd.th.value) {//out of interval
                let dRow: driver4UsherSuggest = await this.createDriverRow(
                  priority,
                  rd.did.value,
                  reason);
                dRow.freeSeats = rd.seats.value;
                drivers.push(dRow);
              }
            } else {
              let dRow: driver4UsherSuggest = await this.createDriverRow(
                priority,
                rd.did.value,
                reason);
              dRow.freeSeats = rd.seats.value;
              drivers.push(dRow);
            }
          }
        }
        else {
          console.log(`Should not be here (rd.id=${rd.id})`)
        }
      }
    }
    return drivers;
  }

  private async driversMadeRideWithSameLineButNoRideForLast5days(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];

    let lastFiveDaysDIds: string[] = [];
    let fiveDaysAgo = addDays(-5, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.did.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))//date checked before (more importent priority), no need to get again.
        .and(cur.date.isGreaterOrEqualTo(fiveDaysAgo))
    })) {
      if (!(lastFiveDaysDIds.includes(r.did.value))) {
        lastFiveDaysDIds.push(r.did.value);
      }
    }


    let dIds: string[] = [];
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.did.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))
        .and(cur.fid.isEqualTo(this.fid))
        .and(cur.tid.isEqualTo(this.tid))
        .and(cur.did.isNotIn(...lastFiveDaysDIds))
    })) {
      if (!(lastFiveDaysDIds.includes(r.did.value))) {//not in last 5 days.
        if (!(dIds.includes(r.did.value))) {// keep distinct
          dIds.push(r.did.value);
        }
      }
    }

    for (const id of dIds) {
      let dRow: driver4UsherSuggest = await this.createDriverRow(
        priority,
        id,
        reason);
      result.push(dRow);
    }

    return result;
  }

  private async driversMadeRideWithSameAreaButNoRideForLast5days(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];

    let lastFiveDaysDIds: string[] = [];
    let fiveDaysAgo = addDays(-5, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.did.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))
        .and(cur.date.isGreaterOrEqualTo(fiveDaysAgo))
    })) {
      if (!(lastFiveDaysDIds.includes(r.did.value))) {
        lastFiveDaysDIds.push(r.did.value);
      }
    }

    let dIds: string[] = [];
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.did.isDifferentFrom('')
        .and((cur.fid.isIn(...(this.locAreas.find(ar => ar.border === this.fid.value).areaBorders)))
          .or(cur.tid.isIn(...(this.locAreas.find(ar => ar.border === this.tid.value).areaBorders))))
        .and(cur.did.isNotIn(...lastFiveDaysDIds))
    })) {
      if (!(lastFiveDaysDIds.includes(r.did.value))) {//not in last 5 days.
        if (!(dIds.includes(r.did.value))) {// keep distinct
          dIds.push(r.did.value);
        }
      }
    }

    for (const id of dIds) {
      let dRow: driver4UsherSuggest = await this.createDriverRow(
        priority,
        id,
        reason);
      result.push(dRow);
    }

    return result;
  }

  private async driversMadeRideWithSameArea60daysAgoButNoRideForLast7days(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];

    let lastFiveDaysDIds: string[] = [];
    let sixDaysAgo = addDays(-7, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.did.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))//without current date
        .and(cur.date.isGreaterOrEqualTo(sixDaysAgo))
    })) {
      if (!(lastFiveDaysDIds.includes(r.did.value))) {
        lastFiveDaysDIds.push(r.did.value);
      }
    }

    let dIds: string[] = [];
    let sixteenDaysAgo = addDays(-60, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.did.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))//without current date
        .and(cur.date.isGreaterOrEqualTo(sixteenDaysAgo))
        .and(cur.did.isNotIn(...lastFiveDaysDIds))
        .and((cur.fid.isIn(...this.locAreas.find(ar => ar.border === this.fid.value).areaBorders))
          .or(cur.tid.isIn(...this.locAreas.find(ar => ar.border === this.tid.value).areaBorders)))// from OR to
    })) {
      if (!(lastFiveDaysDIds.includes(r.did.value))) {//not in last 7 days.
        if (!(dIds.includes(r.did.value))) {// keep distinct
          dIds.push(r.did.value);
        }
      }
    }

    for (const id of dIds) {
      let dRow: driver4UsherSuggest = await this.createDriverRow(
        priority,
        id,
        reason);
      result.push(dRow);
    }

    return result;
  }

  private async driversNoRideForLast7days(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];

    // console.log('driversNoRideForLast7days called');
    let lastFiveDaysDIds: string[] = [];
    let sevenDaysAgo = addDays(-7, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.did.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))
        .and(cur.date.isGreaterOrEqualTo(sevenDaysAgo))
    })) {
      if (!(lastFiveDaysDIds.includes(r.did.value))) {
        lastFiveDaysDIds.push(r.did.value);
      }
    }

    // let t = '2c984378-89eb-42f6-98a2-1eb25a798b5d';

    // if(lastFiveDaysDIds.includes(t)){
    //   console.log('lastFiveDaysDIds includes driver test');
    // }
    // else{
    //   console.log('lastFiveDaysDIds NOT includes driver test');
    // }

    // let c = await this.context.for(Driver).count();
    // console.log('count: ' + c);
    // c= 0;
    // for await (const d of this.context.for(Driver).iterate()){
    //   ++c;
    // } 
    // console.log('count: ' + c);

    let dIds: string[] = [];
    for await (const d of this.context.for(Driver).iterate({
      where: cur => cur.id.isNotIn(...lastFiveDaysDIds)
        .and(cur.uid.isDifferentFrom(''))//driver with no user
    })) {
      // ++c;
      // console.log('name: ' + d.name.value + ', id: ' + d.id.value);
      // if (d.name.value === 'test' || d.id.value === t) {
      //   console.log('Found driver test');
      // }
      if (!(dIds.includes(d.id.value))) {
        // if (d.name.value === 'test' || d.id.value === t) {
        //   console.log('Push driver test');
        // }
        dIds.push(d.id.value);
      }
    }
    // console.log('count: ' + c);

    for (const id of dIds) {
      let dRow: driver4UsherSuggest = await this.createDriverRow(
        priority,
        id,
        reason);
      result.push(dRow);
    }

    return result;
  }

  // private async driversFreezed(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
  //   let result: driver4UsherSuggest[] = [];

  //   let lastFiveDaysDIds: string[] = [];
  //   let today = addDays(0);
  //   for await (const d of this.context.for(Driver).iterate({
  //     where: cur => cur.freezeTillDate.isDifferentFrom('')
  //       .and(cur.date.isLessThan(this.date))
  //       .and(cur.date.isGreaterOrEqualTo(fiveDaysAgo))
  //   })) {
  //     if (!(lastFiveDaysDIds.includes(d.did.value))) {
  //       lastFiveDaysDIds.push(d.did.value);
  //     }
  //   }

  //   let dIds: string[] = [];
  //   for await (const r of this.context.for(Driver).iterate({
  //     where: cur => cur.id.isNotIn(...lastFiveDaysDIds)
  //   })) {
  //     if (!(dIds.includes(r.id.value))) {
  //       dIds.push(r.id.value);
  //     }
  //   }

  //   for (const id of dIds) {
  //     let dRow: driver4UsherSuggest = await this.createDriverRow(
  //       priority,
  //       id,
  //       reason);
  //     result.push(dRow);
  //   }

  //   return result;
  // }

  private async createDriverRow(priority: number, did: string, reason: string): Promise<driver4UsherSuggest> {
    let lastRideDays = -999999;
    let lastRide = await this.context.for(Ride).findFirst({//see even tommorrow and above
      where: r => r.did.isEqualTo(did)
        .and(r.status.isNotIn(RideStatus.w4_Accept)),//DONE! any ride (at least w4_Start)
      orderBy: r => [{ column: r.date, descending: true }, { column: r.visitTime, descending: false }],
    });
    if (lastRide) {
      lastRideDays = daysDiff(addDays(TODAY), lastRide.date.value);
    }
    let d = await this.context.for(Driver).findId(did);
    if (!(d)) {
      throw 'NO DRIVER ????? (did=' + did + ')'
    }
    let home = '';
    if (d.hasCity()) {
      home = d.city.value;
    }
    let mobile = '';
    if (d.hasMobile()) {
      mobile = d.mobile.value;
    }
    let name = '';
    if (d.hasName()) {
      name = d.name.value;
    }
    if ((!(name)) || (name.length == 0)) {
      name = 'no-name';
      // console.log(`${did}-${name}`);
    }
    let seats = 0;
    if (d.hasSeats()) {
      seats = d.seats.value;
    }
    let freeze: Date = undefined;
    if (d.hasFreezeDate()) {
      freeze = d.freezeTillDate.value;
    }

    let lastCallDays = -999999;
    let c = await this.context.for(DriverCall).findFirst(
      {
        where: cur => cur.did.isEqualTo(did),
        orderBy: cur => [{ column: cur.created, descending: true }]// newest first
      }
    );
    if (c && c.created) {
      lastCallDays = daysDiff(addDays(TODAY), resetTime(c.created.value));
    }

    let row: driver4UsherSuggest = {
      home: home,
      did: did,
      lastCallDays: lastCallDays,
      lastRideDays: lastRideDays,
      mobile: mobile,
      name: name,
      reason: reason,
      freeSeats: seats,
      seats: seats,
      priority: priority,
      freeze: freeze
    };
    return row;
  }

  private distinct(source: driver4UsherSuggest[] = [], add: driver4UsherSuggest[] = []) {
    if (add.length > 0) {
      for (const row of add) {
        if (source.length > 0) {
          let d = source.find(r => { return r.did === row.did });
          if (!d) {
            source.push(row);
          }
          else {
            let i = source.indexOf(d);
            if (row.priority < source[i].priority) {//less is more
              // more importent, replace priority&reason
              source[i].reason = row.reason;
              source[i].priority = row.priority;
            }
          }
        }
        else {
          source.push(row);
        }
      }
    }
  }

}

@Component({
  selector: 'app-suggest-driver',
  templateUrl: './suggest-driver.component.html',
  styleUrls: ['./suggest-driver.component.scss']
})
export class SuggestDriverComponent implements OnInit {

  static readonly ONE_DAY_MS = 24 * 60 * 60 * 1000;
  static readonly STOP_AFTER_FIRST_REASON = true;

  args: { date?: Date, fid?: string, tid?: string }
  selected: { did: string, status: string } = { did: '', status: '' };

  search = new StringColumn({
    dataControlSettings: () => ({ clickIcon: 'search', click: async () => await this.filter() }),
    caption: 'Search here for driver name',
    valueChange: async () => await this.filter()
  });

  async filter() {
    if (this.search.value && this.search.value.length > 0) {
      this.drivers = this.origin.filter(cur => cur.name.trim().toLowerCase().includes(this.search.value.trim().toLowerCase()));
    }
    else {
      this.drivers = this.origin;
    }
  }

  origin: driver4UsherSuggest[] = [];
  drivers: driver4UsherSuggest[] = [];
  params = new usherSuggestDrivers(this.context);
  constructor(private context: Context, private dialogRef: MatDialogRef<any>, private dialog: DialogService) {
  }

  async ngOnInit() {
    this.params.date.value = this.args.date;
    this.params.fid.value = this.args.fid;
    this.params.tid.value = this.args.tid;
    await this.refresh();
    this.origin = this.drivers;
  }

  async onDriverSelected(r: driver4UsherSuggest) {
    this.selected.did = r.did;
    this.close();
  }

  close() {
    this.dialogRef.close();
  }

  async refresh() {
    this.drivers = await this.params.retrieve();
  }

  async openCallDocumentationDialog(d: driver4UsherSuggest) {
    let lastCallDays = await DriverCall.openCallDocumentationDialog(this.context, d.did, d.name);
    if (d.lastCallDays !== NOT_FOUND_DAYS && d.lastCallDays !== lastCallDays) {
      d.lastCallDays = lastCallDays;
    }
  }

  async showRegisterRide(d: driver4UsherSuggest) {
    let rd = await this.context.for(RegisterDriver).findFirst(cur => cur.did.isEqualTo(d.did));
    if (rd) {
      if (rd.rid.value) {
        await this.context.openDialog(GridDialogComponent, gd => gd.args = {
          title: `${d.name} Rides`,
          settings: this.context.for(Ride).gridSettings({
            where: r => r.id.isEqualTo(rd.rid),
            orderBy: r => [{ column: r.date, descending: true }],
            allowCRUD: false,
            allowDelete: false,
            // showPagination: false,
            numOfColumnsInGrid: 10,
            columnSettings: r => [
              r.fid,
              r.tid,
              r.date,
              r.pid,
              r.status,
            ],
          }),
        });
      }
      else if (rd.rrid.value) {
        await this.context.openDialog(GridDialogComponent, gd => gd.args = {
          title: `${d.name} Register Rides`,
          settings: this.context.for(RegisterRide).gridSettings({
            where: r => r.id.isEqualTo(rd.rrid),
            orderBy: r => [{ column: r.fdate, descending: true }],
            allowCRUD: false,
            allowDelete: false,
            // showPagination: false,
            numOfColumnsInGrid: 10,
            columnSettings: r => [
              r.fid,
              r.tid,
              r.fdate,
              r.tdate,
              // r.,
              // r.status,
            ],
          }),
        });
      }
    }
  }

  async showDriverRides(d: driver4UsherSuggest) {
    let lastRideDays = await openDriverRides(d.did, this.context);
    if (lastRideDays !== NOT_FOUND_DAYS && d.lastRideDays !== lastRideDays) {
      d.lastRideDays = lastRideDays;
    }
  }

}
