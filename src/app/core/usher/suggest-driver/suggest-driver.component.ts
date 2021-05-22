import { Component, OnInit } from '@angular/core';
import { Context, Filter, ServerFunction } from '@remult/core';
import { driver4UsherSuggest } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Driver } from '../../drivers/driver';
import { RegisterDriver } from '../../drivers/driver-register/registerDriver';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';

@Component({
  selector: 'app-suggest-driver',
  templateUrl: './suggest-driver.component.html',
  styleUrls: ['./suggest-driver.component.scss']
})
export class SuggestDriverComponent implements OnInit {

  args: {
    rId: string,
  }

  drivers: driver4UsherSuggest[] = [];

  constructor(private context: Context) { }

  async ngOnInit() {
    await this.refresh();
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
    //0. drivers registered to same locations
    drivers.push(...(await SuggestDriverComponent.driversRegistered(ride, context)));
    //1. drivers with same locations
    drivers.push(...(await SuggestDriverComponent.driversWithSameLocations(ride, context)));

    //2. drivers with same prefered locations.

    //3. drivers with same locations for last 3 months.

    //4. drivers did ride with same area locations.

    //5. drivers not did ride for last 7 days.

    for await (const d of context.for(Driver).iterate({

    })) {

    }

    return drivers;
  }

  static async driversRegistered(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];


    // for await (const rgD of context.for(RegisterDriver).iterate({
    //   where: d => d.rgId.isEqualTo(same.id),
    // })) {
    // };



    for await (const same of context.for(RegisterRide).iterate({
      where: r => r.fromLoc.isEqualTo(ride.fromLocation)
        .and(r.toLoc.isEqualTo(ride.toLocation))
        .and(r.date.isEqualTo(ride.date))
    })) {
      for await (const rgD of context.for(RegisterDriver).iterate({
        where: d => d.rgId.isEqualTo(same.id),
      })) {
        //(same.passengers || rgD.seats)
        let d = await context.for(Driver).findId(rgD.dId);
        let lastRideDays = 0;
        let lastRide = await context.for(Ride).findFirst({
          where: r => r.driverId.isEqualTo(rgD.dId),
          orderBy: r => [{ column: r.date, descending: true }],
        });
        if (lastRide) {
          lastRideDays = +(new Date()) - +lastRide.date;
        }
        let takenSeats = 0;
        for await (const taken of context.for(Ride).iterate({
          where: r => r.fromLocation.isEqualTo(ride.fromLocation)
            .and(r.toLocation.isEqualTo(ride.toLocation))
            .and(r.date.isEqualTo(ride.date))
            .and(r.driverId.isEqualTo(rgD.dId))
        })) {
          takenSeats += taken.passengers();
        }
        let row: driver4UsherSuggest = {
          home: d.home.value,
          id: d.id.value,
          lastCallDays: 0,
          lastRideDays: lastRideDays,
          mobile: d.mobile.value,
          name: d.name.value,
          reason: '1. registered(future): same locations&date',
          freeSeats: d.seats.value - takenSeats,
          isMatchPrefs: false,
          seats: d.seats.value,
        };
        drivers.push(row);
      };
    };

    for await (const rgD of context.for(RegisterDriver).iterate({
      where: d => d.rId.isEqualTo(ride.id),
    })) {
      //(same.passengers || rgD.seats)
      let d = await context.for(Driver).findId(rgD.dId);
      let lastRideDays = 0;
      let lastRide = await context.for(Ride).findFirst({
        where: r => r.driverId.isEqualTo(rgD.dId),
        orderBy: r => [{ column: r.date, descending: true }],
      });
      if (lastRide) {
        lastRideDays = +(new Date()) - +lastRide.date;
      }
      let takenSeats = 0;
      for await (const taken of context.for(Ride).iterate({
        where: r => r.fromLocation.isEqualTo(ride.fromLocation)
          .and(r.toLocation.isEqualTo(ride.toLocation))
          .and(r.date.isEqualTo(ride.date))
          .and(r.driverId.isEqualTo(rgD.dId))
      })) {
        takenSeats += taken.passengers();
      }
      let row: driver4UsherSuggest = {
        home: d.home.value,
        id: d.id.value,
        lastCallDays: 0,
        lastRideDays: lastRideDays,
        mobile: d.mobile.value,
        name: d.name.value,
        reason: '1. registered(ride): same locations&date',
        freeSeats: d.seats.value - takenSeats,
        isMatchPrefs: false,
        seats: d.seats.value,
      };
      drivers.push(row);
    };

    // for await (const same of context.for(Ride).iterate({
    //   where: r => r.fromLocation.isEqualTo(ride.fromLocation)
    //     .and(r.toLocation.isEqualTo(ride.toLocation))
    //     .and(r.date.isEqualTo(ride.date))
    //     .and(r.status.isIn(RideStatus.waitingForStart))
    //     .and(r.isHasDriver() ? new Filter(() => { return true; }) : new Filter(() => { return false; }))
    // })) {
    //   for await (const rgD of context.for(RegisterDriver).iterate({
    //     where: d => d.rgId.isEqualTo(same.id),
    //   })) {
    //     //(same.passengers || rgD.seats)
    //     let d = await context.for(Driver).findId(rgD.dId);
    //     let lastRideDays = 0;
    //     let lastRide = await context.for(Ride).findFirst({
    //       where: r => r.driverId.isEqualTo(rgD.dId),
    //       orderBy: r => [{ column: r.date, descending: true }],
    //     });
    //     if (lastRide) {
    //       lastRideDays = +(new Date()) - +lastRide.date;
    //     }
    //     let takenSeats = 0;
    //     for await (const taken of context.for(Ride).iterate({
    //       where: r => r.fromLocation.isEqualTo(ride.fromLocation)
    //         .and(r.toLocation.isEqualTo(ride.toLocation))
    //         .and(r.date.isEqualTo(ride.date))
    //         .and(r.driverId.isEqualTo(rgD.dId))
    //     })) {
    //       takenSeats += taken.passengers();
    //     }
    //     let row: driver4UsherSuggest = {
    //       home: d.home.value,
    //       id: d.id.value,
    //       lastCallDays: 0,
    //       lastRideDays: lastRideDays,
    //       mobile: d.mobile.value,
    //       name: d.name.value,
    //       reason: 'registered(ride): same locations&date',
    //       freeSeats: d.seats.value - takenSeats,
    //       isMatchPrefs: false,
    //       seats: d.seats.value,
    //     };
    //     drivers.push(row);
    //   };
    // };
    return drivers;
  }

  static async driversWithSameLocations(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];

    for await (const same of context.for(Ride).iterate({
      where: r => r.fromLocation.isEqualTo(ride.fromLocation)
        .and(r.toLocation.isEqualTo(ride.toLocation))
        .and(r.date.isEqualTo(ride.date))
        .and(r.status.isIn(RideStatus.waitingForStart))
        .and(r.isHasDriver() ? new Filter(() => { true }) : new Filter(() => { false }))
    })) {
      let driverId = same.driverId.value;
      let d = await context.for(Driver).findId(driverId);
      let lastRideDays = 0;
      let lastRide = await context.for(Ride).findFirst({
        where: r => r.driverId.isEqualTo(driverId),
        orderBy: r => [{ column: r.date, descending: true }],
      });
      if (lastRide) {
        lastRideDays = +(new Date()) - +lastRide.date;
      }
      let takenSeats = 0;
      for await (const taken of context.for(Ride).iterate({
        where: r => r.fromLocation.isEqualTo(ride.fromLocation)
          .and(r.toLocation.isEqualTo(ride.toLocation))
          .and(r.date.isEqualTo(ride.date))
          .and(r.driverId.isEqualTo(driverId))
      })) {
        takenSeats += taken.passengers();
      }

      let row: driver4UsherSuggest = {
        home: d.home.value,
        id: d.id.value,
        lastCallDays: 0,
        lastRideDays: lastRideDays,
        mobile: d.mobile.value,
        name: d.name.value,
        reason: '2. same locations(ride)',
        freeSeats: d.seats.value - takenSeats,
        isMatchPrefs: false,
        seats: d.seats.value,
      };
      drivers.push(row);
    }
    return drivers;
  }

}
