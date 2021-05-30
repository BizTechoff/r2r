import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DateColumn, Entity, NumberColumn, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { driver4UsherSuggest } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Driver, DriverIdColumn } from '../../drivers/driver';
import { RegisterDriver } from '../../drivers/driver-register/registerDriver';
import { DriverPrefs } from '../../drivers/driverPrefs';
import { Location, LocationType } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';
import { addDays } from '../usher';



@ServerController({ key: 'usherSuggestDrivers', allowed: [Roles.admin, Roles.usher] })
class usherSuggestDrivers {
  date = new DateColumn();
  fid = new StringColumn();
  tid = new StringColumn();
  constructor(private context: Context) { }

  @ServerMethod({ allowed: [Roles.admin, Roles.usher] })
  async retrieveSuggestedDrivers() {
    let result: driver4UsherSuggest[] = [];

    let dateMidNight = new Date(this.date.value.getFullYear(), this.date.value.getMonth(), this.date.value.getDate());
    let last7Days = addDays(-7, dateMidNight);
    let last90Days = addDays(-90, dateMidNight);

    let dids: { did: string, freeze: Date, seats: number, mobile: string, home: string };//all
    let rids: { rid: string, date: Date, fid: string, tid: string, pass: number };//90 days ago

    let dids7DaysAgo: { did: string, days: number }[] = [];
    let didsLastRide: { did: string, days: number }[] = [];
    for await (const ride of this.context.for(Ride).iterate({//only date
      where: cur => cur.date.isGreaterOrEqualTo(last90Days)//last90Days<date<today
        .and(cur.date.isLessOrEqualTo(dateMidNight))
        .and(cur.driverId.isDifferentFrom('')),//driver NOT empty
      orderBy: cur => [{ column: cur.date, descending: true }]//new->old(today,today-1,...,today-90)
    })) {

      let diff = +dateMidNight - +ride.date.value;
      let days = (-1 * (Math.ceil(diff / 1000 / 60 / 60 / 24) + 1));

      if (ride.date.isEqualTo(dateMidNight)) {
        //freeze
        //same-ride
      }
      else {//ride.date.value<dateMidNight

        // if(ride.fid.type == LocationType.border){
        //   // look by border!
        // }
        // else if(ride.tid.type == LocationType.border){
        //   // look by kav!
        // }

        if (!(didsLastRide.find(d => d.did === ride.driverId.value))) {
          didsLastRide.push({ did: ride.driverId.value, days: days })
        }

        if (ride.date.value < last7Days) {// collect did from last 7 days
          if (!(dids7DaysAgo.find(d => d.did === ride.driverId.value))) {
            dids7DaysAgo.push({ did: ride.driverId.value, days: days })
          }
        }

        this.distinct(result,
          (await this.driversRegistered()));
      }
    }



    // console.log('start');
    //1. drivers registered to same locations
    this.distinct(result,
      (await this.driversRegistered()));
    //2. drivers with same locations
    this.distinct(result,
      (await this.driversWithSameLocations()));//same kav (fid&tid - B->H | fid - H->B)
    //3. drivers with same prefered locations.
    this.distinct(result,
      (await this.driversWithSamePrefs()));

    //4. drivers with same locations for last 3 months.
    this.distinct(result,
      (await this.driversMadeRideWithSameLocations3MonthsAgo()));
    //5. drivers did ride with same area locations.
    // console.log('middle);');
    // return drivers;
    this.distinct(result,
      (await this.driversMadeRideWithSameArea()));
    //6. drivers not did ride for last 7 days.
    this.distinct(result,
      (await this.driversNoRideOnLast7Days()));
    // console.log("end");
    result.sort((d1, d2) => d1.priority - d2.priority == 0 /*same*/
      ? d1.lastRideDays - d2.lastRideDays
      : d1.priority - d2.priority);

    return result;
  }

  private distinct(source: driver4UsherSuggest[], add: driver4UsherSuggest[]) {
    if (add.length > 0) {
      for (const row of add) {
        if (source.length > 0) {
          let d = source.find(r => {
            return r.did === row.did
          });
          if (!d) {
            source.push(row);
          }
          else {
            let i = source.indexOf(d);
            if (row.priority < source[i].priority) {//less is more
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

  private async driversRegistered(): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rr of this.context.for(RegisterRide).iterate({
      where: r => r.fdate.isLessOrEqualTo(this.date)//fdate=<date<=tdate
        .and(r.tdate.isGreaterOrEqualTo(this.date))
        .and(r.fid.isEqualTo(this.fid))
        .and(r.tid.isEqualTo(this.tid)),
    })) {
      for await (const rd of this.context.for(RegisterDriver).iterate({
        where: d => d.rrId.isEqualTo(rr.id),
      })) {
        let dRow: driver4UsherSuggest = await this.createDriverRow(
          1,
          rd.dId.value,
          'registered');
        drivers.push(dRow);
      };
    };

    for await (const same of this.context.for(RegisterRide).iterate({
      where: r => r.fdate.isLessOrEqualTo(this.date)//fdate=<date<=tdate
        .and(r.tdate.isGreaterOrEqualTo(this.date))
        .and(r.tid.isEqualTo(this.tid))
        .and(r.fid.isEqualTo(this.fid))
    })) {
      for await (const rgD of this.context.for(RegisterDriver).iterate({
        where: d => d.rdId.isEqualTo(same.id),
      })) {


        let dRow: driver4UsherSuggest = await this.createDriverRow(
          2,
          rgD.dId.value,
          'registered(future)');
        drivers.push(dRow);
      };
    };

    return drivers;
  }

  private async driversWithSameLocations(): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];
    for await (const same of this.context.for(Ride).iterate({
      where: r => r.date.isEqualTo(this.date)
        .and(r.tid.isEqualTo(this.tid))
        .and(r.fid.isEqualTo(this.fid))
        .and(r.status.isIn(RideStatus.waitingForStart))
        .and(r.driverId.isDifferentFrom(''))
    })) {
      let dRow: driver4UsherSuggest = await this.createDriverRow(
        3,
        same.driverId.value,
        'same ride');
      drivers.push(dRow);
    }
    return drivers;
  }

  private async driversWithSamePrefs(): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let dIds: string[] = [];
    for await (const pref of this.context.for(DriverPrefs).iterate({
      where: pf => pf.locationId.isIn(this.fid),
    })) {
      if (!(dIds.includes(pref.driverId.value))) {
        dIds.push(pref.driverId.value);

        let dRow: driver4UsherSuggest = await this.createDriverRow(
          4,
          pref.driverId.value,
          'same prefered borders');
        result.push(dRow);
      }
    }
    return result;
  }

  private async driversMadeRideWithSameLocations3MonthsAgo(): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let threeMonthsAgo = addDays(-90);
    let dIds: string[] = [];
    for await (const same of this.context.for(Ride).iterate({
      where: r => r.date.isGreaterOrEqualTo(threeMonthsAgo)
        .and(r.fid.isIn(this.fid))
        .and(r.driverId.isDifferentFrom('')),
    })) {
      if (!(dIds.includes(same.driverId.value))) {
        dIds.push(same.driverId.value);

        let dRow: driver4UsherSuggest = await this.createDriverRow(
          5,
          same.driverId.value,
          'same border on 3 month ago');
        result.push(dRow);
      }
    }
    return result;
  }

  private async driversMadeRideWithSameArea(): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let dIds: string[] = [];
    // console.log(this.fid.value);
    let rLoc = await this.context.for(Location).findId(this.fid.value);

    let lIds: string[] = [];
    for await (const loc of this.context.for(Location).iterate({
      where: l => l.type.isEqualTo(LocationType.border)
      //.and( l.area.isDifferentFrom(null))
      //.and( l.area.isEqualTo(rLoc.area)),
    })) {
      if (loc.area.value == rLoc.area.value) {
        lIds.push(loc.id.value);
      }
    }
    for await (const same of this.context.for(Ride).iterate({
      where: r => r.fid.isIn(...lIds)
        .and(r.driverId.isDifferentFrom('')),
    })) {
      if (!(dIds.includes(same.driverId.value))) {
        dIds.push(same.driverId.value);

        let dRow: driver4UsherSuggest = await this.createDriverRow(
          6,
          same.driverId.value,
          'same area');
        result.push(dRow);
      }
    }
    return result;
  }

  private async driversNoRideOnLast7Days(): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let last7Days = addDays(-7, today);
    let dIdsIn7Days: string[] = [];

    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.date.isGreaterOrEqualTo(last7Days)//without Today
    })) {
      // collect drivers from last 7 days.
      if (!(dIdsIn7Days.includes(r.driverId.value))) {
        dIdsIn7Days.push(r.driverId.value);
      }
    }

    // retrun all the others
    for await (const d of this.context.for(Driver).iterate({
      where: cur => cur.id.isNotIn(...dIdsIn7Days)//without Today
    })) {
      let dRow: driver4UsherSuggest = await this.createDriverRow(
        7,
        d.id.value,
        'no ride last 7 days');
      result.push(dRow);
    }

    return result;
  }

  private async createDriverRow(priority: number, did: string, reason: string): Promise<driver4UsherSuggest> {
    let lastRideDays = 0;
    let lastRide = await this.context.for(Ride).findFirst({
      where: r => r.driverId.isEqualTo(did),
      orderBy: r => [{ column: r.date, descending: true }],
    });
    if (lastRide) {
      let diff = (+(new Date())) - (+lastRide.date.value);
      lastRideDays = (-1 * (Math.ceil(diff / SuggestDriverComponent.ONE_DAY_MS) + 1));
    }
    let takenSeats = 0;
    for await (const taken of this.context.for(Ride).iterate({
      where: r => r.fid.isEqualTo(this.fid.value)
        .and(r.tid.isEqualTo(this.tid.value))
        .and(r.date.isEqualTo(this.date.value))
        .and(r.driverId.isEqualTo(did))
    })) {
      takenSeats += taken.passengers();
    };
    let d = await this.context.for(Driver).findId(did);
    let home = '';
    if (d && d.hasHome()) {
      home = d.home.value;
    }
    let mobile = '';
    if (d && d.hasMobile()) {
      mobile = d.mobile.value;
    }
    let name = '';
    if (d) {
      name = d.name.value;
    }
    if ((!(name)) || (name.length == 0)) {
      console.log(did);
      name = 'no-name';
      console.log(name);
    }
    let seats = 0;
    if (d) {
      seats = d.seats.value;
    }

    let row: driver4UsherSuggest = {
      home: home,
      did: did,
      lastCallDays: 0,
      lastRideDays: lastRideDays,
      mobile: mobile,
      name: name,
      reason: reason,
      freeSeats: seats - takenSeats,
      seats: seats,
      priority: priority,
    };
    return row;
  }
}

@ServerController({ key: 'usherSuggestDrivers2', allowed: [Roles.admin, Roles.usher] })
class usherSuggestDrivers2 {
  date = new DateColumn();
  fid = new StringColumn();
  tid = new StringColumn();
  constructor(private context: Context) { }

  @ServerMethod({ allowed: [Roles.admin, Roles.usher] })
  async retrieveSuggestedDrivers() {
    let drivers: driver4UsherSuggest[] = [];
    //1. drivers registered to same locations
    this.distinct(drivers,
      (await this.driversRegistered()));
    //2. drivers with same locations
    this.distinct(drivers,
      (await this.driversWithSameLocations()));
    //3. drivers with same prefered locations.
    this.distinct(drivers,
      (await this.driversWithSamePrefs()));
    //4. drivers with same locations for last 3 months.
    this.distinct(drivers,
      (await this.driversMadeRideWithSameLocations3MonthsAgo()));
    //5. drivers did ride with same area locations.
    this.distinct(drivers,
      (await this.driversMadeRideWithSameArea()));
    //6. drivers not did ride for last 7 days.
    this.distinct(drivers,
      (await this.driversNoRideOnLast7Days()));

    drivers.sort((d1, d2) => d1.priority - d2.priority == 0 /*same*/
      ? d1.lastRideDays - d2.lastRideDays
      : d1.priority - d2.priority);

    return drivers;
  }

  private distinct(source: driver4UsherSuggest[], add: driver4UsherSuggest[]) {
    if (add.length > 0) {
      for (const row of add) {
        if (source.length > 0) {
          let d = source.find(r => {
            return r.did === row.did
          });
          if (!d) {
            source.push(row);
          }
          else {
            let i = source.indexOf(d);
            if (row.priority < source[i].priority) {//less is more
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

  private async driversRegistered(): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rr of this.context.for(RegisterRide).iterate({
      where: cur => cur.fdate.isLessOrEqualTo(this.date)//fdate=<date<=tdate
        .and(cur.tdate.isGreaterOrEqualTo(this.date))
        .and(cur.fid.isEqualTo(this.fid))
        .and(cur.tid.isEqualTo(this.tid)),
    })) {
      for await (const rd of this.context.for(RegisterDriver).iterate({
        where: cur => cur.rrId.isEqualTo(rr.id),
      })) {
        let dRow: driver4UsherSuggest = await this.createDriverRow(
          1,
          rd.dId.value,
          'registered');
        drivers.push(dRow);
      };
    };

    // for await (const rr of this.context.for(RegisterRide).iterate({
    //   where: cur => cur.fdate.isLessOrEqualTo(this.date)//fdate=<date<=tdate
    //     .and(cur.tdate.isGreaterOrEqualTo(this.date))
    //     .and(cur.tid.isEqualTo(this.tid))
    //     .and(cur.fid.isEqualTo(this.fid))
    // })) {
    //   for await (const rgD of this.context.for(RegisterDriver).iterate({
    //     where: cur => cur.rdId.isEqualTo(rr.id),
    //   })) {
    //     let dRow: driver4UsherSuggest = await this.createDriverRow(
    //       2,
    //       rgD.dId.value,
    //       'registered(future)');
    //     drivers.push(dRow);
    //   };
    // };

    return drivers;
  }

  private async driversWithSameLocations(): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];
    for await (const same of this.context.for(Ride).iterate({
      where: r => r.date.isEqualTo(this.date)
        .and(r.fid.isEqualTo(this.fid))
        .and(r.tid.isEqualTo(this.tid))
        .and(r.status.isIn(RideStatus.waitingForStart))
        .and(r.driverId.isDifferentFrom(''))
    })) {
      let dRow: driver4UsherSuggest = await this.createDriverRow(
        3,
        same.driverId.value,
        'same ride');
      drivers.push(dRow);
    }
    return drivers;
  }

  private async driversWithSamePrefs(): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let dIds: string[] = [];
    for await (const pref of this.context.for(DriverPrefs).iterate({
      where: pf => pf.locationId.isIn(this.fid),
    })) {
      if (!(dIds.includes(pref.driverId.value))) {
        dIds.push(pref.driverId.value);

        let dRow: driver4UsherSuggest = await this.createDriverRow(
          4,
          pref.driverId.value,
          'same prefered borders');
        result.push(dRow);
      }
    }
    return result;
  }

  private async driversMadeRideWithSameLocations3MonthsAgo(): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let threeMonthsAgo = addDays(-90);
    let dIds: string[] = [];
    for await (const same of this.context.for(Ride).iterate({
      where: r => r.date.isGreaterOrEqualTo(threeMonthsAgo)
        .and(r.fid.isIn(this.fid))
        .and(r.driverId.isDifferentFrom('')),
    })) {
      if (!(dIds.includes(same.driverId.value))) {
        dIds.push(same.driverId.value);

        let dRow: driver4UsherSuggest = await this.createDriverRow(
          5,
          same.driverId.value,
          'same border on 3 month ago');
        result.push(dRow);
      }
    }
    return result;
  }

  private async driversMadeRideWithSameArea(): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let dIds: string[] = [];
    // console.log(this.fid.value);
    let rLoc = await this.context.for(Location).findId(this.fid.value);

    let lIds: string[] = [];
    for await (const loc of this.context.for(Location).iterate({
      where: l => l.type.isEqualTo(LocationType.border)
      //.and( l.area.isDifferentFrom(null))
      //.and( l.area.isEqualTo(rLoc.area)),
    })) {
      if (loc.area.value == rLoc.area.value) {
        lIds.push(loc.id.value);
      }
    }
    for await (const same of this.context.for(Ride).iterate({
      where: r => r.fid.isIn(...lIds)
        .and(r.driverId.isDifferentFrom('')),
    })) {
      if (!(dIds.includes(same.driverId.value))) {
        dIds.push(same.driverId.value);

        let dRow: driver4UsherSuggest = await this.createDriverRow(
          6,
          same.driverId.value,
          'same area');
        result.push(dRow);
      }
    }
    return result;
  }

  private async driversNoRideOnLast7Days(): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let last7Days = addDays(-7, today);
    let dIdsIn7Days: string[] = [];

    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.date.isGreaterOrEqualTo(last7Days)//without Today
    })) {
      // collect drivers from last 7 days.
      if (!(dIdsIn7Days.includes(r.driverId.value))) {
        dIdsIn7Days.push(r.driverId.value);
      }
    }

    // retrun all the others
    for await (const d of this.context.for(Driver).iterate({
      where: cur => cur.id.isNotIn(...dIdsIn7Days)//without Today
    })) {
      let dRow: driver4UsherSuggest = await this.createDriverRow(
        7,
        d.id.value,
        'no ride last 7 days');
      result.push(dRow);
    }

    return result;
  }

  private async createDriverRow(priority: number, did: string, reason: string): Promise<driver4UsherSuggest> {
    let lastRideDays = 0;
    let lastRide = await this.context.for(Ride).findFirst({
      where: r => r.driverId.isEqualTo(did),
      orderBy: r => [{ column: r.date, descending: true }],
    });
    if (lastRide) {
      let diff = (+(new Date())) - (+lastRide.date.value);
      lastRideDays = (-1 * (Math.floor(diff / SuggestDriverComponent.ONE_DAY_MS)));
    }
    let takenSeats = 0;
    for await (const taken of this.context.for(Ride).iterate({
      where: r => r.fid.isEqualTo(this.fid.value)
        .and(r.tid.isEqualTo(this.tid.value))
        .and(r.date.isEqualTo(this.date.value))
        .and(r.driverId.isEqualTo(did))
    })) {
      takenSeats += taken.passengers();
    };
    let d = await this.context.for(Driver).findId(did);
    let home = '';
    if (d && d.hasHome()) {
      home = d.home.value;
    }
    let mobile = '';
    if (d && d.hasMobile()) {
      mobile = d.mobile.value;
    }
    let name = '';
    if (d) {
      name = d.name.value;
    }
    if ((!(name)) || (name.length == 0)) {
      console.log(did);
      name = 'no-name';
      console.log(name);
    }
    let seats = 0;
    if (d) {
      seats = d.seats.value;
    }

    let row: driver4UsherSuggest = {
      home: home,
      did: did,
      lastCallDays: 0,
      lastRideDays: lastRideDays,
      mobile: mobile,
      name: name,
      reason: reason,
      freeSeats: seats - takenSeats,
      seats: seats,
      priority: priority,
    };
    return row;
  }
}


class SuggestDriver extends Entity {

  did = new DriverIdColumn({ caption: "Driver" });
  name = new StringColumn();
  mobile = new StringColumn();
  home = new StringColumn();
  seats = new NumberColumn();
  freeSeats = new StringColumn();
  lastRideDays = new StringColumn();
  lastCallDays = new StringColumn();
  priority = new StringColumn();
  reason = new StringColumn();

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

  // grid: GridSettings;
  // mem = new InMemoryDataProvider();

  drivers: driver4UsherSuggest[] = [];
  params = new usherSuggestDrivers2(this.context);
  constructor(private context: Context, private dialogRef: MatDialogRef<any>, private dialog: DialogService) {
  }

  async ngOnInit() {
    this.params.date.value = this.args.date;
    this.params.fid.value = this.args.fid;
    this.params.tid.value = this.args.tid;

    // (new InMemoryDataProvider()).rows["SuggestDriver"] = this.drivers

    await this.refresh();
  }

  async onDriverSelected(r: driver4UsherSuggest) {
    this.selected.did = r.did;
    this.select();
  }

  select() {
    this.dialogRef.close();
  }

  async refresh() {
    this.drivers = await this.params.retrieveSuggestedDrivers();
    // this.mem.rows["SuggestDriver"] = this.drivers;
    // if (this.context) {
    //   this.grid = this.context.for(SuggestDriver, this.mem).gridSettings({ allowCRUD: false, numOfColumnsInGrid: 10 });
    // }
  }

}
