import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, Filter, ServerFunction } from '@remult/core';
import { driver4UsherSuggest } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Driver } from '../../drivers/driver';
import { RegisterDriver } from '../../drivers/driver-register/registerDriver';
import { DriverPrefs } from '../../drivers/driverPrefs';
import { Location } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';
import { addDays } from '../usher';

@Component({
  selector: 'app-suggest-driver',
  templateUrl: './suggest-driver.component.html',
  styleUrls: ['./suggest-driver.component.scss']
})
export class SuggestDriverComponent implements OnInit {

  static readonly ONE_DAY_MS = 24 * 60 * 60 * 1000;
  static readonly STOP_AFTER_FIRST_REASON = true;

  args: {
    rId: string,
  }

  drivers: driver4UsherSuggest[] = [];
  selectedId = '';

  constructor(private context: Context, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    await this.refresh();
  }

  async onDriverSelected(r: driver4UsherSuggest) {
    let ride = await this.context.for(Ride).findId(this.args.rId);
    if (ride) {
      ride.driverId.value = r.did;
      ride.status.value = RideStatus.waitingForAccept;
      await ride.save();
      this.selectedId = r.did;
      this.select();
    }
  }
 
  select() {
    this.dialogRef.close();
  }

  async refresh() {
    this.drivers = await SuggestDriverComponent.retrieveSuggestedDrivers(
      this.args.rId,
      this.context,
    );
  }

  @ServerFunction({ allowed: Roles.admin })
  static async retrieveSuggestedDrivers(rId: string, context?: Context) {
    let drivers: driver4UsherSuggest[] = [];

    let ride = await context.for(Ride).findId(rId);
    //1. drivers registered to same locations
    SuggestDriverComponent.distinct(drivers,
      (await SuggestDriverComponent.driversRegistered(ride, context)));
    //2. drivers with same locations
    SuggestDriverComponent.distinct(drivers,
      (await SuggestDriverComponent.driversWithSameLocations(ride, context)));
    //3. drivers with same prefered locations.
    SuggestDriverComponent.distinct(drivers,
      (await SuggestDriverComponent.driversWithSamePrefs(ride, context)));
    //4. drivers with same locations for last 3 months.
    SuggestDriverComponent.distinct(drivers,
      (await SuggestDriverComponent.driversMadeRideWithSameLocations3MonthsAgo(ride, context)));
    //5. drivers did ride with same area locations.
    SuggestDriverComponent.distinct(drivers,
      (await SuggestDriverComponent.driversMadeRideWithSameArea(ride, context)));
    //6. drivers not did ride for last 7 days.
    SuggestDriverComponent.distinct(drivers,
      (await SuggestDriverComponent.driversNoRideOnLast7Days(ride, context)));

    drivers.sort((d1, d2) => d1.priority - d2.priority == 0 /*same*/
      ? d1.lastRideDays - d2.lastRideDays
      : d1.priority - d2.priority);

    return drivers;
  }

  private static distinct(source: driver4UsherSuggest[], add: driver4UsherSuggest[]) {
    if (add.length > 0) {
      for (const row of add) {
        if (source.length > 0) {
          let d = source.find(r => {
            return r.did === row.did
          });
          if (d) {
            if (!(SuggestDriverComponent.STOP_AFTER_FIRST_REASON)) {
              for (const rsn of row.reasons) {
                if (d.reasons.length > 0) {
                  let d2 = d.reasons.find(r => r.includes(rsn));
                  if (!(d2)) {
                    // priority not changed.
                    d.reasons.push(rsn);
                  }
                }
                else {
                  // priority not changed.
                  d.reasons.push(rsn);
                }
              }
            }
          }
          else {
            // The most-importent priority set once.
            source.push(row);
          }
        }
        else {
          // The most-importent priority set once.
          source.push(row);
        }
      }
    }
  }

  static async driversRegistered(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rgD of context.for(RegisterDriver).iterate({
      where: d => d.rId.isEqualTo(ride.id),
    })) {

      let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
        1,
        rgD.dId.value,
        ride.fromLocation.value,
        ride.toLocation.value,
        ride.date.value,
        'registered',
        context);
      drivers.push(dRow);
    };

    for await (const same of context.for(RegisterRide).iterate({
      where: r => r.fromLoc.isEqualTo(ride.fromLocation)
        .and(r.toLoc.isEqualTo(ride.toLocation))
        .and(r.date.isEqualTo(ride.date))
    })) {
      for await (const rgD of context.for(RegisterDriver).iterate({
        where: d => d.rgId.isEqualTo(same.id),
      })) {


        let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
          2,
          rgD.dId.value,
          ride.fromLocation.value,
          ride.toLocation.value,
          ride.date.value,
          'registered(future)',
          context);
        drivers.push(dRow);
      };
    };

    return drivers;
  }

  static async driversWithSameLocations(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];
    for await (const same of context.for(Ride).iterate({
      where: r => r.fromLocation.isEqualTo(ride.fromLocation)
        .and(r.toLocation.isEqualTo(ride.toLocation))
        .and(r.date.isEqualTo(ride.date))
        .and(r.status.isIn(RideStatus.waitingForStart))
        .and(new Filter((f) => { f.isNotNull(r.driverId) }))
        .and(new Filter((f) => { f.isDifferentFrom(r.driverId, ''); })),
    })) {
      let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
        3,
        same.driverId.value,
        same.fromLocation.value,
        same.toLocation.value,
        ride.date.value,
        'same ride',
        context);
      drivers.push(dRow);
    }
    return drivers;
  }

  static async driversWithSamePrefs(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let dIds: string[] = [];
    for await (const pref of context.for(DriverPrefs).iterate({
      where: pf => pf.locationId.isIn(ride.fromLocation),
    })) {
      if (!(dIds.includes(pref.driverId.value))) {
        dIds.push(pref.driverId.value);

        let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
          4,
          pref.driverId.value,
          ride.fromLocation.value,
          ride.toLocation.value,
          ride.date.value,
          'same prefered borders',
          context);
        result.push(dRow);
      }
    }
    return result;
  }

  static async driversMadeRideWithSameLocations3MonthsAgo(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let threeMonthsAgo = addDays(-90);
    let dIds: string[] = [];
    for await (const same of context.for(Ride).iterate({
      where: r => r.fromLocation.isIn(ride.fromLocation)
        .and(r.date.isGreaterOrEqualTo(threeMonthsAgo)),
    })) {
      if (!(dIds.includes(same.driverId.value))) {
        dIds.push(same.driverId.value);

        let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
          5,
          same.driverId.value,
          same.fromLocation.value,
          same.toLocation.value,
          same.date.value,
          'same border on 3 month ago',
          context);
        result.push(dRow);
      }
    }
    return result;
  }

  static async driversMadeRideWithSameArea(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let area: string[] = [];
    let dIds: string[] = [];

    let rLoc = await context.for(Location).findId(ride.fromLocation.value);

    let lIds: string[] = [];
    for await (const loc of context.for(Location).iterate({
      where: l => l.area.isEqualTo(rLoc.area),
    })) {
      lIds.push(loc.id.value);
    }
    for await (const same of context.for(Ride).iterate({
      where: r => r.fromLocation.isIn(...lIds),
    })) {
      if (!(dIds.includes(same.driverId.value))) {
        dIds.push(same.driverId.value);

        let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
          6,
          same.driverId.value,
          same.fromLocation.value,
          same.toLocation.value,
          same.date.value,
          'same area',
          context);
        result.push(dRow);
      }
    }
    return result;
  }

  static async driversNoRideOnLast7Days(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let result: driver4UsherSuggest[] = [];
    let last7Days = addDays(-7);
    let dIds: string[] = [];

    let allIds: string[] = [];
    for await (const d of context.for(Driver).iterate({
    })) {
      allIds.push(d.id.value);
    }
    for await (const same of context.for(Ride).iterate({
      where: r => r.date.isGreaterThan(last7Days)
        .and(r.driverId.isNotIn(...dIds)),
    })) {
      if (!(dIds.includes(same.driverId.value))) {
        dIds.push(same.driverId.value);

        let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
          7,
          same.driverId.value,
          same.fromLocation.value,
          same.toLocation.value,
          same.date.value,
          'no ride last 7 days',
          context);
        result.push(dRow);
      }
    }
    return result;
  }

  private static async createDriverRow(priority: number, did: string, fid: string, tid: string, date: Date, reason: string, context: Context): Promise<driver4UsherSuggest> {
    let lastRideDays = 0;
    let lastRide = await context.for(Ride).findFirst({
      where: r => r.driverId.isEqualTo(did),
      orderBy: r => [{ column: r.date, descending: true }],
    });
    if (lastRide) {
      let diff = (+(new Date())) - (+lastRide.date.value);
      lastRideDays = (-1 * (Math.ceil(diff / SuggestDriverComponent.ONE_DAY_MS) + 1));
    }
    let takenSeats = 0;
    for await (const taken of context.for(Ride).iterate({
      where: r => r.fromLocation.isEqualTo(fid)
        .and(r.toLocation.isEqualTo(tid))
        .and(r.date.isEqualTo(date))
        .and(r.driverId.isEqualTo(did))
    })) {
      takenSeats += taken.passengers();
    };
    let d = await context.for(Driver).findId(did);
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
    // if((!(name)) || (name.length == 0)){
    //   name = 'no-name';
    // }
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
      reasons: [reason],
      freeSeats: seats - takenSeats,
      isMatchPrefs: false,
      seats: seats,
      priority: priority,
    };
    return row;
  }

}
