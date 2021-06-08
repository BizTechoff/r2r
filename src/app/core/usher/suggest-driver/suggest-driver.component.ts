import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DateColumn, NumberColumn, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { driver4UsherSuggest, PickupTimePrevHours, TimeColumn, TODAY } from '../../../shared/types';
import { addDays, addHours, daysDiff, resetTime } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { Driver } from '../../drivers/driver';
import { RegisterDriver } from '../../drivers/driver-register/registerDriver';
import { DriverCall } from '../../drivers/driverCall';
import { Location, LocationArea, LocationIdColumn, LocationType } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';


@ServerController({ key: 'u/suggest', allowed: [Roles.admin, Roles.usher] })
class usherSuggestDrivers {

  date = new DateColumn();
  fid = new LocationIdColumn();
  tid = new LocationIdColumn();
  from = new StringColumn();
  to = new StringColumn();
  bAreas: { border: string, area?: LocationArea, areaBorders: string[] }[] = [];

  constructor(private context: Context) { }

  @ServerMethod({ allowed: [Roles.admin, Roles.usher] })
  async retrieve() {
    let drivers: driver4UsherSuggest[] = [];
    let priority = 0;

    // prepare kav & area
    this.bAreas = [];
    for await (const loc of this.context.for(Location).iterate({})) {
      if (loc.id.value === this.fid.value) {
        this.from.value = loc.name.value;
      }
      else if (loc.id.value === this.tid.value) {
        this.to.value = loc.name.value;
      }
      if (loc.type == LocationType.border) {
        let f = this.bAreas.find(cur => cur.area === loc.area.value);
        if (!(f)) {
          f = { border: loc.id.value, area: loc.area.value, areaBorders: [] };
          this.bAreas.push(f);
        }
        f.areaBorders.push(loc.id.value);
      }
      else {
        this.bAreas.push({ border: loc.id.value, areaBorders: [] });
      }
    }

    this.distinct(drivers,
      (await this.driversWithSameKavToday(++priority, 'has same ride - at current date')));

    this.distinct(drivers,
      (await this.driversRegisteredSameKavToday(++priority, 'register to kav - at current date')));

    this.distinct(drivers,
      (await this.driversRegisteredSameAreaToday(++priority, 'register to area - at current date')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameKavButNoRideForLast5days(++priority, 'done same kav - no ride last 5 days')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameAreaButNoRideForLast5days(++priority, 'done same area - no ride last 5 days')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameArea60daysAgoButNoRideForLast7days(++priority, 'done same area last 60 days - no ride last 7 days')));

    this.distinct(drivers,
      (await this.driversNoRideForLast7days(++priority, 'no ride last 7 days')));

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

  private async driversWithSameKavToday(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];
    let dids: { did: string, taken: number }[] = [];
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.date.isEqualTo(this.date)
        .and(cur.fid.isEqualTo(this.fid))
        .and(cur.tid.isEqualTo(this.tid))
        .and(cur.status.isIn(RideStatus.waitingForStart))
        .and(cur.driverId.isDifferentFrom(''))
    })) {
      let f = dids.find(cur => cur.did === r.driverId.value);
      if (!(f)) {
        f = { did: r.driverId.value, taken: 0 };
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
          console.log('row.seats=' + row.seats);
          console.log('itm.taken=' + itm.taken);
          row.freeSeats = row.seats - itm.taken;
          drivers.push(row);
        }
      }
    }
    return drivers;
  }

  private async driversRegisteredSameKavToday(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rd of this.context.for(RegisterDriver).iterate({
      where: cur => cur.date.isEqualTo(this.date)
    })) {

      if (rd.rid.value) {
        let r = await this.context.for(Ride).findId(rd.rid);
        if (r) {
          //if(ride.status.value == RideStatus.waitingForDriver)//look only for kav-details
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
                  reason + `(anytime)`);
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
                  reason + `(anytime)`);
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
          //if(ride.status.value == RideStatus.waitingForDriver)//look only for kav-details
          let fab = this.bAreas.find(cur => cur.border === this.fid.value).areaBorders;
          let tab = this.bAreas.find(cur => cur.border === this.tid.value).areaBorders;
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
          let fab = this.bAreas.find(cur => cur.border === this.fid.value).areaBorders;
          let tab = this.bAreas.find(cur => cur.border === this.tid.value).areaBorders;
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

  private async driversMadeRideWithSameKavButNoRideForLast5days(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];

    let lastFiveDaysDIds: string[] = [];
    let fiveDaysAgo = addDays(-5, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.driverId.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))//date checked before (more importent priority), no need to get again.
        .and(cur.date.isGreaterOrEqualTo(fiveDaysAgo))
    })) {
      if (!(lastFiveDaysDIds.includes(r.driverId.value))) {
        lastFiveDaysDIds.push(r.driverId.value);
      }
    }


    let dIds: string[] = [];
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.driverId.isDifferentFrom('')
        .and(cur.fid.isEqualTo(this.fid))
        .and(cur.tid.isEqualTo(this.tid))
    })) {
      if (!(lastFiveDaysDIds.includes(r.driverId.value))) {//not in last 5 days.
        if (!(dIds.includes(r.driverId.value))) {// keep distinct
          dIds.push(r.driverId.value);
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
      where: cur => cur.driverId.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))
        .and(cur.date.isGreaterOrEqualTo(fiveDaysAgo))
    })) {
      if (!(lastFiveDaysDIds.includes(r.driverId.value))) {
        lastFiveDaysDIds.push(r.driverId.value);
      }
    }

    let dIds: string[] = [];
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.driverId.isDifferentFrom('')
        .and((cur.fid.isIn(...(this.bAreas.find(ar => ar.border === this.fid.value).areaBorders)))
          .or(cur.tid.isIn(...(this.bAreas.find(ar => ar.border === this.tid.value).areaBorders))))// from OR to
    })) {
      if (!(lastFiveDaysDIds.includes(r.driverId.value))) {//not in last 5 days.
        if (!(dIds.includes(r.driverId.value))) {// keep distinct
          dIds.push(r.driverId.value);
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
      where: cur => cur.driverId.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))//without current date
        .and(cur.date.isGreaterOrEqualTo(sixDaysAgo))
    })) {
      if (!(lastFiveDaysDIds.includes(r.driverId.value))) {
        lastFiveDaysDIds.push(r.driverId.value);
      }
    }

    let dIds: string[] = [];
    let sixteenDaysAgo = addDays(-60, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.driverId.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))//without current date
        .and(cur.date.isGreaterOrEqualTo(sixteenDaysAgo))
        .and((cur.fid.isIn(...this.bAreas.find(ar => ar.border === this.fid.value).areaBorders))
          .or(cur.tid.isIn(...this.bAreas.find(ar => ar.border === this.tid.value).areaBorders)))// from OR to
    })) {
      if (!(lastFiveDaysDIds.includes(r.driverId.value))) {//not in last 7 days.
        if (!(dIds.includes(r.driverId.value))) {// keep distinct
          dIds.push(r.driverId.value);
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

    let lastFiveDaysDIds: string[] = [];
    let fiveDaysAgo = addDays(-7, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.driverId.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))
        .and(cur.date.isGreaterOrEqualTo(fiveDaysAgo))
    })) {
      if (!(lastFiveDaysDIds.includes(r.driverId.value))) {
        lastFiveDaysDIds.push(r.driverId.value);
      }
    }

    let dIds: string[] = [];
    for await (const r of this.context.for(Driver).iterate({
      where: cur => cur.id.isNotIn(...lastFiveDaysDIds)
    })) {
      if (!(dIds.includes(r.id.value))) {
        dIds.push(r.id.value);
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

  private async createDriverRow(priority: number, did: string, reason: string): Promise<driver4UsherSuggest> {
    let lastRideDays = -999999;
    let lastRide = await this.context.for(Ride).findFirst({//see even tommorrow and above
      where: r => r.driverId.isEqualTo(did)
        .and(r.status.isNotIn(RideStatus.waitingForAccept)),//DONE! any ride (at least w4_Start)
      orderBy: r => [{ column: r.date, descending: true }, { column: r.visitTime, descending: false }],
    });
    if (lastRide) {
      lastRideDays = daysDiff(new Date(), lastRide.date.value);
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
      console.log(`${did}-${name}`);
    }
    let seats = 0;
    if (d.hasSeats()) {
      seats = d.seats.value;
    }

    let lastCallDays = -999999;
    let c = await this.context.for(DriverCall).findFirst(
      {
        where: cur => cur.dId.isEqualTo(did),
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

  serach = '';

  async filter() {
    if (this.serach && this.serach.length > 0) {
      this.drivers = this.origin.filter(cur => cur.name.trim().toLowerCase().includes(this.serach.trim().toLowerCase()));
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
    this.select();
  }

  select() {
    this.dialogRef.close();
  }

  async refresh() {
    this.drivers = await this.params.retrieve();
  }

  async openCallDocumentationDialog(d: driver4UsherSuggest) {
    await DriverCall.openCallDocumentationDialog(this.context, d.did, d.name);
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
              r.patientId,
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

    let pass = new NumberColumn({ caption: 'Pass' });
    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `${d.name} Rides`,
      settings: this.context.for(Ride).gridSettings({
        where: r => r.driverId.isEqualTo(d.did),
        orderBy: r => [{ column: r.date, descending: true }],
        allowCRUD: false,
        allowDelete: false,
        // showPagination: false,
        numOfColumnsInGrid: 10,
        columnSettings: cur => [
          cur.fid,
          cur.tid,
          cur.date,
          cur.pickupTime,
          { column: pass, getValue: (r) => { return r.passengers(); } },
          cur.patientId,
          cur.status,
        ],
        // rowButtons: [
        //   {
        //     textInMenu: 'Edit',
        //     icon: 'edit',
        //     click: async (r) => { await this.editRide(r); },
        //   },
        // ],
      }),
    });
  }

}
