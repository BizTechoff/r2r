import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DateColumn, Entity, NumberColumn, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { driver4UsherSuggest } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Driver, DriverIdColumn } from '../../drivers/driver';
import { RegisterDriver } from '../../drivers/driver-register/registerDriver';
import { DriverCall } from '../../drivers/driverCall';
import { DriverPrefs } from '../../drivers/driverPrefs';
import { Location, LocationArea, LocationIdColumn, LocationType } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';
import { addDays, addHours } from '../usher';



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
        where: d => d.rrid.isEqualTo(rr.id),
      })) {
        let dRow: driver4UsherSuggest = await this.createDriverRow(
          1,
          rd.did.value,
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
        where: d => d.rid.isEqualTo(same.id),
      })) {


        let dRow: driver4UsherSuggest = await this.createDriverRow(
          2,
          rgD.did.value,
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
  fid = new LocationIdColumn();
  tid = new LocationIdColumn();
  from = new StringColumn();
  to = new StringColumn();
  constructor(private context: Context) { }

  @ServerMethod({ allowed: [Roles.admin, Roles.usher] })
  async retrieveSuggestedDrivers4UsherNew() {
    let drivers: driver4UsherSuggest[] = [];
    let priority = 0;
    //1. rides: =today,=fid,=tid,pass<=free-seats = SAME KAV TODAY WITH FREE SEATS
    await this.suggestDriversW4StartTodaySameKavWithFreeSeats(drivers, ++priority);
    //2. registers: =today,=fid,=tid [,free-seats(as info)] = REGISTER SAME KAV TODAY WITH FREE SEATS
    this.distinct(drivers,
      (await this.driversRegistered(/*++priority*/)));
    //3. registers: =today,fid?isborder?fid-area,tid?isborder?tid-area [,free-seats(as info)] = REGISTER SAME AREA TODAY WITH FREE SEATS
    this.distinct(drivers,
      (await this.driversRegistered(/*++priority*/)));
    //4. rides: date<today,=fid,=tid,not-found(rides5daysAgo),pass<=free-seats = SAME KAV IN-THE-PAST AND NO-RIDES LAST 5 DAYS
    this.distinct(drivers,
      (await this.driversRegistered(/*++priority*/)));
    //5. rides: date<today,fid?isborder?fid-area,tid?isborder?tid-area,not-found(rides5daysAgo),pass<=free-seats = SAME AREA IN-THE-PAST AND NO-RIDES LAST 5 DAYS
    this.distinct(drivers,
      (await this.driversRegistered(/*++priority*/)));
    //6. rides: date<today-60,fid?isborder?fid-area,tid?isborder?tid-area,not-found(rides7daysAgo),pass<=free-seats = SAME AREA IN-THE-60-DAYS-PAST AND NO-RIDES LAST 7 DAYS
    this.distinct(drivers,
      (await this.driversRegistered(/*++priority*/)));
    //7. rides: date<today-7,not-found(rides7daysAgo),pass<=free-seats = NO-RIDES LAST 7 DAYS
    this.distinct(drivers,
      (await this.driversRegistered(/*++priority*/)));

    drivers.sort((d1, d2) =>
      d1.priority - d2.priority == 0 /*same*/
        ? d1.lastRideDays - d2.lastRideDays == 0 /*same*/
          ? d1.lastCallDays - d2.lastCallDays
          : d1.lastRideDays - d2.lastRideDays
        : d1.priority - d2.priority);
  }

  priority_1 = 1;
  priority_2 = 2;
  priority_3 = 3;
  priority_4 = 4;
  priority_5 = 5;
  priority_6 = 6;
  priority_7 = 7;

  async sameDate(d1: Date, d2: Date) {
    //let zero1 = new Date()
    return d1 === d2;
  }
  async sameKav(f1: StringColumn, t1: StringColumn, f2: StringColumn, t2: StringColumn) {
    return f1.value === f2.value && t1.value === t2.value;
  }
  async sameArea(border: StringColumn, compare: StringColumn) {
    return (await this.getArea(border)).includes(compare.value);
  }
  async getArea(border: StringColumn): Promise<string[]> {
    let result: string[] = [];
    let loc = await this.context.for(Location).findId(border.value);
    if (loc.type.value == LocationType.border) {
      for await (const l of this.context.for(Location).iterate({
        where: cur => cur.area.isEqualTo(loc.area)
      })) {
        result.push(l.id.value);
      }
    }
    return result;
  }

  @ServerMethod({ allowed: [Roles.admin, Roles.usher] })
  async retrieveSuggestedDrivers4Usher() {
    let result: driver4UsherSuggest[] = [];
    let drivers: { id: string, regSeats: number, taken: number, rid: string, reason: string, priority: number }[] = [];

    let algo: { did: string, sameDate: boolean, sameKav: boolean, sameArea: boolean, date: Date, freeSeats: number, rid: string }[] = [];

    algo.push({ did: '1', sameDate: false, sameKav: true, sameArea: true, date: new Date(), freeSeats: 2, rid: '123' });
    algo.push({ did: '2', sameDate: true, sameKav: false, sameArea: true, date: new Date(), freeSeats: 2, rid: '123' });
    algo.push({ did: '3', sameDate: false, sameKav: true, sameArea: false, date: new Date(), freeSeats: 2, rid: '123' });
    algo.push({ did: '4', sameDate: false, sameKav: false, sameArea: false, date: new Date(), freeSeats: 2, rid: '123' });

    for await (const d of this.context.for(Driver).iterate({})) {
      let found = algo.find(cur => cur.did === d.id.value);
      if (found) {
        if (found.sameDate && found.sameKav) {
          // found.priority = this.priority_1;
          // found.reason = 'same-kav on';// + formatDate(ride.date.value, 'dd.MM.yyyy', 'en-US');
        }
      }
      else {

      }
    }

    // Collect help Data
    let todayMidNigth = new Date(this.date.value.getFullYear(), this.date.value.getMonth(), this.date.value.getDate());
    let date60daysAgo = addDays(-60, todayMidNigth);
    for await (const ride of this.context.for(Ride).iterate({
      where: cur => cur.driverId.isDifferentFrom('')//isNotNull
        .and(cur.date.isGreaterOrEqualTo(date60daysAgo))
        .and(cur.date.isLessOrEqualTo(todayMidNigth)),
      orderBy: cur => [{ column: cur.date, descending: true }]
    })) {

      let row = drivers.find(cur => cur.id === ride.driverId.value);
      if (!(row)) {
        row = { id: ride.driverId.value, regSeats: 0, taken: 0, rid: '', reason: '', priority: 0 };
      }

      if (this.sameDate(ride.date.value, this.date.value)) {
        if (this.sameKav(ride.fid, ride.tid, this.fid, this.tid)) {
          row.taken += ride.passengers();
          row.priority = this.priority_1;
          row.reason = 'same-kav | ' + formatDate(ride.date.value, 'dd.MM.yyyy', 'en-US');
        }
        else if (this.sameArea(ride.fid, this.fid)) {

        }
        else if (this.sameArea(ride.tid, this.tid)) {

        }
      }
      else {
        if (this.sameKav(ride.fid, ride.tid, this.fid, this.tid)) {
          row.taken = ride.passengers();
          row.priority = this.priority_1;
          row.reason = 'same-kav | ' + formatDate(ride.date.value, 'dd.MM.yyyy', 'en-US');
        }
        else if (this.sameArea(ride.fid, this.fid)) {

        }
        else if (this.sameArea(ride.tid, this.tid)) {

        }
      }

      if (ride.date.value === this.date.value) {//='today'
        if (ride.fid.value === this.fid.value && ride.tid.value === this.tid.value) {//same kav
          if (ride.status.value == RideStatus.waitingForStart) {// not started yet
            row.taken += ride.passengers();
            row.priority = this.priority_1;
            row.reason = 'same-kav | today'
          }
          else {
            row.rid = ride.id.value;//for later find rr
            row.priority = this.priority_2;
            row.reason = "register"
          }
        }
        else {
          if (ride.fid.value === this.fid.value) {
            let areaIds: string[] = [];
            let from = await this.context.for(Location).findId(ride.fid.value);
            if (from.type.value == LocationType.border) {
              for await (const loc of this.context.for(Location).iterate({
                where: cur => cur.area.isEqualTo(from.area)
              })) {
                areaIds.push(loc.id.value);
              }
            }
          }
          else if (ride.tid.value === this.tid.value) {

          }
        }
      }
      else {//<'today'

      }

      let found = drivers.find(cur => cur.id === row.id);
      if (!(found)) {//distinct drivers (by first-priority)
        // found = { id: ride.driverId.value, regSeats: 0, taken: 0, rid: '', reason: '', priority: 0 };
        drivers.push(row);
      }
      else if (found.priority > row.priority) {
        found.priority = row.priority;
        found.reason = row.reason;
        found.regSeats = row.regSeats;
        found.rid = row.rid;
        found.taken = row.taken;
      }

      let rd = await this.context.for(RegisterDriver).findFirst(cur => cur.did.isEqualTo(found.id));
      if (rd) {
        found.priority = 2;
        found.reason = 'register';
        found.regSeats = rd.seats.value;
      }

      // }

    }

    // Set the result
    for (const d of drivers) {
      result.push();
    }
    // calc free-seats

    // .and(cur.status.isNotIn(...RideStatus.isNoDriverRelevent))
    // if (!(RideStatus.isNoDriverRelevent.includes(ride.status.value)))// driver is relevent
    // found = { id: ride.driverId.value, pass: 0 };
    // dids.push(found);

    // found.pass += ride.passengers();
  }

  //   for(const d of dids) {
  //     let found = drivers.find(cur => cur.did === d.id);
  //     if (!(found)) {
  //       let driver = await this.context.for(Driver).findId(d.id);
  //       let fSeats = driver.seats.value - d.pass;

  //       let dRow: driver4UsherSuggest = await this.createDriverRow4Usher(
  //         priority,
  //         d.id,
  //         `same date same kav | ${fSeats} seats`);// | not-started-drive-yet');
  //       dRow.freeSeats = dRow.seats - fSeats;
  //       drivers.push(dRow);
  //       //// `same date same kav | ${fSeats} seats`);// | not-started-drive-yet');
  //     }
  //   }



  //     //1. rides: =today,=fid,=tid,pass<=free-seats = SAME KAV TODAY WITH FREE SEATS
  //     await this.suggestDriversW4StartTodaySameKavWithFreeSeats(drivers, ++priority);
  // //2. registers: =today,=fid,=tid [,free-seats(as info)] = REGISTER SAME KAV TODAY WITH FREE SEATS
  // this.distinct(drivers,
  //   (await this.driversRegistered(/*++priority*/)));
  // //3. registers: =today,fid?isborder?fid-area,tid?isborder?tid-area [,free-seats(as info)] = REGISTER SAME AREA TODAY WITH FREE SEATS
  // this.distinct(drivers,
  //   (await this.driversRegistered(/*++priority*/)));
  // //4. rides: date<today,=fid,=tid,not-found(rides5daysAgo),pass<=free-seats = SAME KAV IN-THE-PAST AND NO-RIDES LAST 5 DAYS
  // this.distinct(drivers,
  //   (await this.driversRegistered(/*++priority*/)));
  // //5. rides: date<today,fid?isborder?fid-area,tid?isborder?tid-area,not-found(rides5daysAgo),pass<=free-seats = SAME AREA IN-THE-PAST AND NO-RIDES LAST 5 DAYS
  // this.distinct(drivers,
  //   (await this.driversRegistered(/*++priority*/)));
  // //6. rides: date<today-60,fid?isborder?fid-area,tid?isborder?tid-area,not-found(rides7daysAgo),pass<=free-seats = SAME AREA IN-THE-60-DAYS-PAST AND NO-RIDES LAST 7 DAYS
  // this.distinct(drivers,
  //   (await this.driversRegistered(/*++priority*/)));
  // //7. rides: date<today-7,not-found(rides7daysAgo),pass<=free-seats = NO-RIDES LAST 7 DAYS
  // this.distinct(drivers,
  //   (await this.driversRegistered(/*++priority*/)));

  // drivers.sort((d1, d2) =>
  //   d1.priority - d2.priority == 0 /*same*/
  //     ? d1.lastRideDays - d2.lastRideDays == 0 /*same*/
  //       ? d1.lastCallDays - d2.lastCallDays
  //       : d1.lastRideDays - d2.lastRideDays
  //     : d1.priority - d2.priority);
  //   }

  async suggestDriversW4StartTodaySameKavWithFreeSeats(drivers: driver4UsherSuggest[], priority: number) {
    let dids: { id: string, pass: number }[] = [];
    for await (const ride of this.context.for(Ride).iterate({
      where: cur => cur.date.isEqualTo(this.date)
        .and(cur.fid.isEqualTo(this.fid))
        .and(cur.tid.isEqualTo(this.tid))
        .and(cur.status.isIn(RideStatus.waitingForStart))
        .and(cur.driverId.isDifferentFrom(''))
    })) {
      // calc free-seats
      let found = dids.find(d => d.id === ride.driverId.value);
      if (!(found)) {
        found = { id: ride.driverId.value, pass: 0 };
        dids.push(found);
      }
      found.pass += ride.passengers();
    }
    for (const d of dids) {
      let found = drivers.find(cur => cur.did === d.id);
      if (!(found)) {
        let driver = await this.context.for(Driver).findId(d.id);
        let fSeats = driver.seats.value - d.pass;

        let dRow: driver4UsherSuggest = await this.createDriverRow4Usher(
          priority,
          d.id,
          `same date same kav | ${fSeats} seats`);// | not-started-drive-yet');
        dRow.freeSeats = dRow.seats - fSeats;
        drivers.push(dRow);
        //// `same date same kav | ${fSeats} seats`);// | not-started-drive-yet');
      }
    }
  }

  private async createDriverRow4Usher(priority: number, did: string, reason: string): Promise<driver4UsherSuggest> {
    let lastRideDays = 0;
    let lastRide = await this.context.for(Ride).findFirst({
      where: r => r.driverId.isEqualTo(did),
      orderBy: r => [{ column: r.date, descending: true }],
    });
    if (lastRide) {
      let diff = (+(new Date())) - (+lastRide.date.value);
      lastRideDays = (-1 * (Math.floor(diff / SuggestDriverComponent.ONE_DAY_MS)));
    }
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
      freeSeats: seats,
      seats: seats,
      priority: priority,
    };
    return row;
  }


  @ServerMethod({ allowed: [Roles.admin, Roles.usher] })
  async retrieveSuggestedDrivers() {
    let drivers: driver4UsherSuggest[] = [];
    //1. drivers with same locations
    this.distinct(drivers,
      (await this.driversWithSameLocations()));
    //2. drivers registered to same locations
    this.distinct(drivers,
      (await this.driversRegistered()));
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
  bAreas: { border: string, area?: LocationArea, areaBorders: string[] }[] = [];

  @ServerMethod({ allowed: [Roles.admin, Roles.usher] })
  async retrieveSuggestedDriversNew() {
    let drivers: driver4UsherSuggest[] = [];
    let priority = 0;

    // prepare kav & area
    this.bAreas = [];
    for await (const loc of this.context.for(Location).iterate({
      // where: cur => cur.type.isEqualTo(LocationType.border)
    })) {
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
      (await this.driversWithSameLineTodayNew(++priority, 'same ride today')));

    this.distinct(drivers,
      (await this.driversRegisteredSameKavTodayNew(++priority, 'register to kav')));

    this.distinct(drivers,
      (await this.driversRegisteredSameAreaTodayNew(++priority, 'register to area')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameKavButNoRideForLast5daysNew(++priority, 'done same kav - no ride last 5 days')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameAreaButNoRideForLast5daysNew(++priority, 'done same area - no ride last 5 days')));

    this.distinct(drivers,
      (await this.driversMadeRideWithSameArea60daysAgoButNoRideForLast7daysNew(++priority, 'done same area last 60 days - no ride last 7 days')));

    this.distinct(drivers,
      (await this.driversNoRideForLast7daysNew(++priority, 'no ride last 7 days')));

    drivers.sort((d1, d2) => d1.priority - d2.priority == 0 /*same*/
      ? d1.lastRideDays - d2.lastRideDays
      : d1.priority - d2.priority);

    return drivers;
  }


  // this.distinct(drivers,
  //   (await this.driversWithSamePrefsNew(++priority, 'same prefered borders')));
  //driversMadeRideWithSameKavButNoRideForLast5days

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


  private async driversWithSameLineTodayNew(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
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
      }
      f.taken += r.passengers();
    }

    if (dids.length > 0) {
      for (const itm of dids) {
        let row = await this.createDriverRowNew(
          priority,
          itm.did,
          reason);
        // no free-seats, no relevent
        if (row.seats - itm.taken > 0) {
          row.freeSeats -= itm.taken;
          drivers.push(row);
        }
      }
    }
    return drivers;
  }

  private async driversRegisteredSameKavTodayNew(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rd of this.context.for(RegisterDriver).iterate({
      where: cur => cur.date.isEqualTo(this.date)
    })) {
      if (rd.rid.value) {
        let r = await this.context.for(Ride).findId(rd.rid);
        if (r) {
          //if(ride.status.value == RideStatus.waitingForDriver)//look only for kav-details
          if (r.fid.value === this.fid.value && r.tid.value === this.tid.value) {
            if (r.pickupTime.value && (!(r.pickupTime.value === '00:00'))) {
              if (rd.fh.value > r.pickupTime.value || r.pickupTime.value > rd.th.value) {//out of interval
                continue;
              }
            } else {
              let dRow: driver4UsherSuggest = await this.createDriverRowNew(
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
          if (rr.fid.value === this.fid.value && rr.tid.value === this.tid.value) {
            let pickupTime = '';
            if (rr.visitTime.value && (!(rr.visitTime.value === '00:00'))) {
              pickupTime = addHours(-2, rr.visitTime.value);
            }
            if (pickupTime.length > 0) {
              if (rd.fh.value > pickupTime || pickupTime > rd.th.value) {//out of interval
                continue;
              }
            } else {
              let dRow: driver4UsherSuggest = await this.createDriverRowNew(
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

  private async driversRegisteredSameAreaTodayNew(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
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
          if (fab.includes(r.fid.value) || tab.includes(r.tid.value)) {
            if (r.pickupTime.value && (!(r.pickupTime.value === '00:00'))) {
              if (rd.fh.value > r.pickupTime.value || r.pickupTime.value > rd.th.value) {//out of interval
                continue;
              }
            } else {
              let dRow: driver4UsherSuggest = await this.createDriverRowNew(
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
            if (rr.visitTime.value && (!(rr.visitTime.value === '00:00'))) {
              pickupTime = addHours(-2, rr.visitTime.value);
            }
            if (pickupTime.length > 0) {
              if (rd.fh.value > pickupTime || pickupTime > rd.th.value) {//out of interval
                continue;
              }
            } else {
              let dRow: driver4UsherSuggest = await this.createDriverRowNew(
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

  private async driversMadeRideWithSameKavButNoRideForLast5daysNew(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
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
        .and(cur.fid.isEqualTo(this.fid))
        .and(cur.tid.isEqualTo(this.tid))
    })) {
      if (!(dIds.includes(r.driverId.value))) {
        if (!(lastFiveDaysDIds.includes(r.driverId.value))) {
          dIds.push(r.driverId.value);
        }
      }
    }

    for (const id of dIds) {
      let dRow: driver4UsherSuggest = await this.createDriverRowNew(
        priority,
        id,
        reason);
      result.push(dRow);
    }

    return result;
  }

  private async driversMadeRideWithSameAreaButNoRideForLast5daysNew(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
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
          .or(cur.tid.isIn(...(this.bAreas.find(ar => ar.border === this.tid.value).areaBorders))))
    })) {
      if (!(dIds.includes(r.driverId.value))) {
        if (!(lastFiveDaysDIds.includes(r.driverId.value))) {
          dIds.push(r.driverId.value);
        }
      }
    }

    for (const id of dIds) {
      let dRow: driver4UsherSuggest = await this.createDriverRowNew(
        priority,
        id,
        reason);
      result.push(dRow);
    }

    return result;
  }

  private async driversMadeRideWithSameArea60daysAgoButNoRideForLast7daysNew(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
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

    // let fab = this.bAreas.find(cur => cur.border === this.fid.value).areaBorders;
    // let tab = this.bAreas.find(cur => cur.border === this.tid.value).areaBorders;

    let dIds: string[] = [];
    let sixteenDaysAgo = addDays(-60, this.date.value);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.driverId.isDifferentFrom('')
        .and(cur.date.isLessThan(this.date))
        .and(cur.date.isGreaterOrEqualTo(sixteenDaysAgo))
        .and((cur.fid.isIn(...this.bAreas.find(ar => ar.border === this.fid.value).areaBorders))
          .or(cur.tid.isIn(...this.bAreas.find(ar => ar.border === this.tid.value).areaBorders)))
    })) {
      if (!(dIds.includes(r.driverId.value))) {
        if (!(lastFiveDaysDIds.includes(r.driverId.value))) {
          dIds.push(r.driverId.value);
        }
      }
    }

    for (const id of dIds) {
      let dRow: driver4UsherSuggest = await this.createDriverRowNew(
        priority,
        id,
        reason);
      result.push(dRow);
    }

    return result;
  }

  private async driversNoRideForLast7daysNew(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
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
      let dRow: driver4UsherSuggest = await this.createDriverRowNew(
        priority,
        id,
        reason);
      result.push(dRow);
    }

    return result;
  }

  private async createDriverRowNew(priority: number, did: string, reason: string): Promise<driver4UsherSuggest> {
    let lastRideDays = 0;
    let lastRide = await this.context.for(Ride).findFirst({
      where: r => r.driverId.isEqualTo(did),
      orderBy: r => [{ column: r.date, descending: true }, { column: r.visitTime, descending: false }],
    });
    if (lastRide) {
      let diff = (+(new Date())) - (+lastRide.date.value);
      lastRideDays = (-1 * (Math.floor(diff / SuggestDriverComponent.ONE_DAY_MS)));
    }
    let d = await this.context.for(Driver).findId(did);
    let home = '';
    if (d && d.city) {
      home = d.city.value;
    }
    let mobile = '';
    if (d && d.hasMobile()) {
      mobile = d.mobile.value;
    }
    let name = '';
    if (d && d.name) {
      name = d.name.value;
    }
    if ((!(name)) || (name.length == 0)) {
      name = 'no-name';
      console.log(`${did}-${name}`);
    }
    let seats = 0;
    if (d) {
      seats = d.seats.value;
    }

    let lastCallDays = 0;
    let c = await this.context.for(DriverCall).findFirst(
      {
        where: cur => cur.dId.isEqualTo(did),
        orderBy: cur => [{ column: cur.created, descending: true }]
      }
    );
    if (c && c.created) {
      let diff = (+(new Date())) - (+c.created.value);
      console.log('diff=' + diff);
      lastCallDays = (-1 * (Math.floor(diff / SuggestDriverComponent.ONE_DAY_MS)));
      if (lastCallDays === 0) {
        lastCallDays = 1;
      }
      console.log('lastCallDays=' + lastCallDays);
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

  private async driversRegistered(): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rr of this.context.for(RegisterRide).iterate({
      where: cur => cur.fdate.isLessOrEqualTo(this.date)//fdate=<date<=tdate
        .and(cur.tdate.isGreaterOrEqualTo(this.date))
        .and(cur.fid.isEqualTo(this.fid))
        .and(cur.tid.isEqualTo(this.tid)),
    })) {
      for await (const rd of this.context.for(RegisterDriver).iterate({
        where: cur => cur.rrid.isEqualTo(rr.id),
      })) {
        let dRow: driver4UsherSuggest = await this.createDriverRow(
          1,
          rd.did.value,
          'registered');
        drivers.push(dRow);
      };
    };

    return drivers;
  }

  private async driversWithSamePrefsNew(priority: number, reason: string): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let dIds: string[] = [];
    for await (const pref of this.context.for(DriverPrefs).iterate({
      where: pf => pf.locationId.isIn(this.fid),
    })) {
      if (!(dIds.includes(pref.driverId.value))) {
        dIds.push(pref.driverId.value);

        let dRow: driver4UsherSuggest = await this.createDriverRow(
          priority,
          pref.driverId.value,
          reason);
        result.push(dRow);
      }
    }
    return result;
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
      where: cur => cur.driverId.isEqualTo(did),
      orderBy: cur => [{ column: cur.date, descending: true }, { column: cur.visitTime, descending: false }],
    });
    if (lastRide) {
      let diff = (+(new Date())) - (+lastRide.date.value);
      lastRideDays = (-1 * (Math.ceil(diff / SuggestDriverComponent.ONE_DAY_MS)));
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

  serach = '';

  async filter() {
    if (this.serach && this.serach.length > 0) {
      this.drivers = this.origin.filter(cur => cur.name.trim().toLowerCase().includes(this.serach.trim().toLowerCase()));
    } 
    else {
      this.drivers = this.origin;
    }
  }

  // grid: GridSettings;
  // mem = new InMemoryDataProvider();

  origin: driver4UsherSuggest[] = [];
  drivers: driver4UsherSuggest[] = [];
  params = new usherSuggestDrivers2(this.context);
  constructor(private context: Context, private dialogRef: MatDialogRef<any>, private dialog: DialogService) {
  }

  async ngOnInit() {
    this.params.date.value = this.args.date;
    this.params.fid.value = this.args.fid;
    this.params.tid.value = this.args.tid;

    // let from
    // (new InMemoryDataProvider()).rows["SuggestDriver"] = this.drivers

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
    this.drivers = await this.params.retrieveSuggestedDriversNew();
    // this.mem.rows["SuggestDriver"] = this.drivers;
    // if (this.context) {
    //   this.grid = this.context.for(SuggestDriver, this.mem).gridSettings({ allowCRUD: false, numOfColumnsInGrid: 10 });
    // }
  }

  async openCallDocumentationDialog(d: driver4UsherSuggest) {
    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `Call Documentation For ${d.name}`,
      settings: this.context.for(DriverCall).gridSettings({
        where: c => c.dId.isEqualTo(d.did),
        orderBy: c => [{ column: c.modified.value ? c.modified : c.created, descending: true }, { column: c.created.value ? c.created : c.modified, descending: true }],
        newRow: c => { c.dId.value = d.did; },
        allowCRUD: this.context.isAllowed([Roles.admin, Roles.usher]),
        allowDelete: false,
        numOfColumnsInGrid: 10,
        columnSettings: c => [
          c.doc,
          { column: c.createdBy, readOnly: true },
          { column: c.created, readOnly: true },
          { column: c.modified, readOnly: true },
          { column: c.modifiedBy, readOnly: true },
        ],
      }),
    });
  }

  async showDriverRides(d: driver4UsherSuggest) {

    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `${d.name} Rides`,
      settings: this.context.for(Ride).gridSettings({
        where: r => r.driverId.isEqualTo(d.did),
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

