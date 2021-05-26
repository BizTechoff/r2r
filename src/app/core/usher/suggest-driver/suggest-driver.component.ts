import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DateColumn, Filter, ServerController, ServerFunction, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { driver4UsherSuggest } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Driver } from '../../drivers/driver';
import { RegisterDriver } from '../../drivers/driver-register/registerDriver';
import { DriverPrefs } from '../../drivers/driverPrefs';
import { Location, LocationType } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';
import { addDays } from '../usher';



@ServerController({ key: 'usherSuggestDrivers', allowed: true })
class usherSuggestDrivers {
  date = new DateColumn();
  fid = new StringColumn();
  tid = new StringColumn();
  constructor(private context: Context) { }

  @ServerMethod({ allowed: Roles.admin })
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

  private async driversRegistered(): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const rr of this.context.for(RegisterRide).iterate({
      where: r => r.date.isEqualTo(this.date)
        .and(r.fromLoc.isEqualTo(this.fid))
        .and(r.toLoc.isEqualTo(this.tid)),
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
      where: r => r.fromLoc.isEqualTo(this.fid)
        .and(r.toLoc.isEqualTo(this.tid))
        .and(r.date.isEqualTo(this.date))
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
      where: r => r.fid.isEqualTo(this.fid)
        .and(r.tid.isEqualTo(this.tid))
        .and(r.date.isEqualTo(this.date))
        .and(r.status.isIn(RideStatus.waitingForStart))
        .and(new Filter((f) => { f.isNotNull(r.driverId) }))
        .and(new Filter((f) => { f.isDifferentFrom(r.driverId, ''); })),
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
      where: r => r.fid.isIn(this.fid)
        .and(r.date.isGreaterOrEqualTo(threeMonthsAgo))
        .and(new Filter(f => f.isNotNull(r.driverId)))
        .and(new Filter(f => f.isDifferentFrom(r.driverId, ''))),
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
        .and(l.area.isEqualTo(rLoc.area)),
    })) {
      lIds.push(loc.id.value);
    }
    for await (const same of this.context.for(Ride).iterate({
      where: r => r.fid.isIn(...lIds)
        .and(new Filter(f => f.isNotNull(r.driverId)))
        .and(new Filter(f => f.isDifferentFrom(r.driverId, ''))),
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
    let last7Days = addDays(-7);
    let dIds: string[] = [];

    let allIds: string[] = [];
    for await (const d of this.context.for(Driver).iterate({
    })) {
      allIds.push(d.id.value);
    }
    for await (const same of this.context.for(Ride).iterate({
      where: r => r.date.isGreaterThan(last7Days)
        .and(r.driverId.isNotIn(...dIds)),
    })) {
      if (!(dIds.includes(same.driverId.value))) {
        dIds.push(same.driverId.value);

        let dRow: driver4UsherSuggest = await this.createDriverRow(
          7,
          same.driverId.value,
          // same.fid.value,
          // same.tid.value,
          // same.date.value,
          'no ride last 7 days');
        result.push(dRow);
      }
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
      reasons: [reason],
      freeSeats: seats - takenSeats,
      isMatchPrefs: false,
      seats: seats,
      priority: priority,
    };
    return row;
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

  args: {
    date?: Date,
    fid?: string,
    tid?: string,
  }

  drivers: driver4UsherSuggest[] = [];
  selected: { did: string, status: string } = { did: '', status: '' };
  params = new usherSuggestDrivers(this.context);
  constructor(private context: Context, private dialogRef: MatDialogRef<any>, private dialog: DialogService) {
  }

  async ngOnInit() {
    this.params.date.value = this.args.date;
    this.params.fid.value = this.args.fid;
    this.params.tid.value = this.args.tid;

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
  }

}

  // @ServerFunction({ allowed: Roles.admin })
  // static async retrieveSuggestedDrivers(date: Date, fid: string, tid: string, context?: Context) {
  //   let drivers: driver4UsherSuggest[] = [];

  //   //1. drivers registered to same locations
  //   SuggestDriverComponent.distinct(drivers,
  //     (await SuggestDriverComponent.driversRegistered(date, fid, tid, context)));
  //   //2. drivers with same locations
  //   SuggestDriverComponent.distinct(drivers,
  //     (await SuggestDriverComponent.driversWithSameLocations(date, fid, tid, context)));
  //   //3. drivers with same prefered locations.
  //   SuggestDriverComponent.distinct(drivers,
  //     (await SuggestDriverComponent.driversWithSamePrefs(date, fid, tid, context)));
  //   //4. drivers with same locations for last 3 months.
  //   SuggestDriverComponent.distinct(drivers,
  //     (await SuggestDriverComponent.driversMadeRideWithSameLocations3MonthsAgo(fid, context)));
  //   //5. drivers did ride with same area locations.
  //   SuggestDriverComponent.distinct(drivers,
  //     (await SuggestDriverComponent.driversMadeRideWithSameArea(fid, context)));
  //   //6. drivers not did ride for last 7 days.
  //   SuggestDriverComponent.distinct(drivers,
  //     (await SuggestDriverComponent.driversNoRideOnLast7Days(context)));

  //   drivers.sort((d1, d2) => d1.priority - d2.priority == 0 /*same*/
  //     ? d1.lastRideDays - d2.lastRideDays
  //     : d1.priority - d2.priority);

  //   return drivers;
  // }

  // static distinct(source: driver4UsherSuggest[], add: driver4UsherSuggest[]) {
  //   if (add.length > 0) {
  //     for (const row of add) {
  //       if (source.length > 0) {
  //         let d = source.find(r => {
  //           return r.did === row.did
  //         });
  //         if (d) {
  //           if (!(SuggestDriverComponent.STOP_AFTER_FIRST_REASON)) {
  //             for (const rsn of row.reasons) {
  //               if (d.reasons.length > 0) {
  //                 let d2 = d.reasons.find(r => r.includes(rsn));
  //                 if (!(d2)) {
  //                   // priority not changed.
  //                   d.reasons.push(rsn);
  //                 }
  //               }
  //               else {
  //                 // priority not changed.
  //                 d.reasons.push(rsn);
  //               }
  //             }
  //           }
  //         }
  //         else {
  //           // The most-importent priority set once.
  //           source.push(row);
  //         }
  //       }
  //       else {
  //         // The most-importent priority set once.
  //         source.push(row);
  //       }
  //     }
  //   }
  // }

  // static async driversRegistered(date: Date, fid: string, tid: string, context: Context): Promise<driver4UsherSuggest[]> {
  //   let drivers: driver4UsherSuggest[] = [];

  //   for await (const rr of context.for(RegisterRide).iterate({
  //     where: r => r.date.isEqualTo(date)
  //       .and(r.fromLoc.isEqualTo(fid))
  //       .and(r.toLoc.isEqualTo(tid)),
  //   })) {
  //     for await (const rd of context.for(RegisterDriver).iterate({
  //       where: d => d.rrId.isEqualTo(rr.id),
  //     })) {
  //       let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
  //         1,
  //         rd.dId.value,
  //         fid,
  //         tid,
  //         date,
  //         'registered',
  //         context);
  //       drivers.push(dRow);
  //     };
  //   };

  //   for await (const same of context.for(RegisterRide).iterate({
  //     where: r => r.fromLoc.isEqualTo(fid)
  //       .and(r.toLoc.isEqualTo(tid))
  //       .and(r.date.isEqualTo(date))
  //   })) {
  //     for await (const rgD of context.for(RegisterDriver).iterate({
  //       where: d => d.rdId.isEqualTo(same.id),
  //     })) {


  //       let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
  //         2,
  //         rgD.dId.value,
  //         fid,
  //         tid,
  //         date,
  //         'registered(future)',
  //         context);
  //       drivers.push(dRow);
  //     };
  //   };

  //   return drivers;
  // }

  // static async driversWithSameLocations(date: Date, fid: string, tid: string, context: Context): Promise<driver4UsherSuggest[]> {
  //   let drivers: driver4UsherSuggest[] = [];
  //   for await (const same of context.for(Ride).iterate({
  //     where: r => r.fid.isEqualTo(fid)
  //       .and(r.tid.isEqualTo(tid))
  //       .and(r.date.isEqualTo(date))
  //       .and(r.status.isIn(RideStatus.waitingForStart))
  //       .and(new Filter((f) => { f.isNotNull(r.driverId) }))
  //       .and(new Filter((f) => { f.isDifferentFrom(r.driverId, ''); })),
  //   })) {
  //     let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
  //       3,
  //       same.driverId.value,
  //       same.fid.value,
  //       same.tid.value,
  //       date,
  //       'same ride',
  //       context);
  //     drivers.push(dRow);
  //   }
  //   return drivers;
  // }

  // static async driversWithSamePrefs(date: Date, fid: string, tid: string, context: Context): Promise<driver4UsherSuggest[]> {
  //   let result: driver4UsherSuggest[] = [];
  //   let dIds: string[] = [];
  //   for await (const pref of context.for(DriverPrefs).iterate({
  //     where: pf => pf.locationId.isIn(fid),
  //   })) {
  //     if (!(dIds.includes(pref.driverId.value))) {
  //       dIds.push(pref.driverId.value);

  //       let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
  //         4,
  //         pref.driverId.value,
  //         fid,
  //         tid,
  //         date,
  //         'same prefered borders',
  //         context);
  //       result.push(dRow);
  //     }
  //   }
  //   return result;
  // }

  // static async driversMadeRideWithSameLocations3MonthsAgo(fid: string, context: Context): Promise<driver4UsherSuggest[]> {
  //   let result: driver4UsherSuggest[] = [];
  //   let threeMonthsAgo = addDays(-90);
  //   let dIds: string[] = [];
  //   for await (const same of context.for(Ride).iterate({
  //     where: r => r.fid.isIn(fid)
  //       .and(r.date.isGreaterOrEqualTo(threeMonthsAgo))
  //       .and(new Filter(f => f.isNotNull(r.driverId)))
  //       .and(new Filter(f => f.isDifferentFrom(r.driverId, ''))),
  //   })) {
  //     if (!(dIds.includes(same.driverId.value))) {
  //       dIds.push(same.driverId.value);

  //       let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
  //         5,
  //         same.driverId.value,
  //         same.fid.value,
  //         same.tid.value,
  //         same.date.value,
  //         'same border on 3 month ago',
  //         context);
  //       result.push(dRow);
  //     }
  //   }
  //   return result;
  // }

  // static async driversMadeRideWithSameArea(fid: string, context: Context): Promise<driver4UsherSuggest[]> {
  //   let result: driver4UsherSuggest[] = [];
  //   let area: string[] = [];
  //   let dIds: string[] = [];

  //   let rLoc = await context.for(Location).findId(fid);

  //   let lIds: string[] = [];
  //   for await (const loc of context.for(Location).iterate({
  //     where: l => l.area.isEqualTo(rLoc.area),
  //   })) {
  //     lIds.push(loc.id.value);
  //   }
  //   for await (const same of context.for(Ride).iterate({
  //     where: r => r.fid.isIn(...lIds)
  //       .and(new Filter(f => f.isNotNull(r.driverId)))
  //       .and(new Filter(f => f.isDifferentFrom(r.driverId, ''))),
  //   })) {
  //     if (!(dIds.includes(same.driverId.value))) {
  //       dIds.push(same.driverId.value);

  //       let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
  //         6,
  //         same.driverId.value,
  //         same.fid.value,
  //         same.tid.value,
  //         same.date.value,
  //         'same area',
  //         context);
  //       result.push(dRow);
  //     }
  //   }
  //   return result;
  // }

  // static async driversNoRideOnLast7Days(context: Context): Promise<driver4UsherSuggest[]> {
  //   let result: driver4UsherSuggest[] = [];
  //   let last7Days = addDays(-7);
  //   let dIds: string[] = [];

  //   let allIds: string[] = [];
  //   for await (const d of context.for(Driver).iterate({
  //   })) {
  //     allIds.push(d.id.value);
  //   }
  //   for await (const same of context.for(Ride).iterate({
  //     where: r => r.date.isGreaterThan(last7Days)
  //       .and(r.driverId.isNotIn(...dIds)),
  //   })) {
  //     if (!(dIds.includes(same.driverId.value))) {
  //       dIds.push(same.driverId.value);

  //       let dRow: driver4UsherSuggest = await SuggestDriverComponent.createDriverRow(
  //         7,
  //         same.driverId.value,
  //         same.fid.value,
  //         same.tid.value,
  //         same.date.value,
  //         'no ride last 7 days',
  //         context);
  //       result.push(dRow);
  //     }
  //   }
  //   return result;
  // }

  // private static async createDriverRow(priority: number, did: string, fid: string, tid: string, date: Date, reason: string, context: Context): Promise<driver4UsherSuggest> {
  //   let lastRideDays = 0;
  //   let lastRide = await context.for(Ride).findFirst({
  //     where: r => r.driverId.isEqualTo(did),
  //     orderBy: r => [{ column: r.date, descending: true }],
  //   });
  //   if (lastRide) {
  //     let diff = (+(new Date())) - (+lastRide.date.value);
  //     lastRideDays = (-1 * (Math.ceil(diff / SuggestDriverComponent.ONE_DAY_MS) + 1));
  //   }
  //   let takenSeats = 0;
  //   for await (const taken of context.for(Ride).iterate({
  //     where: r => r.fid.isEqualTo(fid)
  //       .and(r.tid.isEqualTo(tid))
  //       .and(r.date.isEqualTo(date))
  //       .and(r.driverId.isEqualTo(did))
  //   })) {
  //     takenSeats += taken.passengers();
  //   };
  //   let d = await context.for(Driver).findId(did);
  //   let home = '';
  //   if (d && d.hasHome()) {
  //     home = d.home.value;
  //   }
  //   let mobile = '';
  //   if (d && d.hasMobile()) {
  //     mobile = d.mobile.value;
  //   }
  //   let name = '';
  //   if (d) {
  //     name = d.name.value;
  //   }
  //   if ((!(name)) || (name.length == 0)) {
  //     console.log(did);
  //     name = 'no-name';
  //     console.log(name);
  //   }
  //   let seats = 0;
  //   if (d) {
  //     seats = d.seats.value;
  //   }

  //   let row: driver4UsherSuggest = {
  //     home: home,
  //     did: did,
  //     lastCallDays: 0,
  //     lastRideDays: lastRideDays,
  //     mobile: mobile,
  //     name: name,
  //     reasons: [reason],
  //     freeSeats: seats - takenSeats,
  //     isMatchPrefs: false,
  //     seats: seats,
  //     priority: priority,
  //   };
  //   return row;
  // }

