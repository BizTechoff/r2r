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
    drivers.push(...(await SuggestDriverComponent.driversRegisteredSameLocations(ride, context)));
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

  static async driversRegisteredSameLocations(ride: Ride, context: Context): Promise<driver4UsherSuggest[]> {
    let drivers: driver4UsherSuggest[] = [];
    
    for await (const same of context.for(RegisterRide).iterate({
      where: r => r.fromLoc.isEqualTo(ride.fromLocation)
      .and(r.toLoc.isEqualTo(ride.toLocation))
      .and(r.date.isEqualTo(ride.date))
    })){
      // if(same.)
      for await (const regDriver of context.for(RegisterDriver).iterate({
        where: d => d.regRideId.isEqualTo(same.id),
      })){
        
      };
    };

    for await (const same of context.for(Ride).iterate({
      where: r => r.fromLocation.isEqualTo(ride.fromLocation)
        .and(r.toLocation.isEqualTo(ride.toLocation))
        .and(r.date.isEqualTo(ride.date))
        .and(r.status.isIn(RideStatus.waitingForStart))
        .and(r.isHasDriver() ? new Filter(() => { true }) : new Filter(() => { false }))
    })) {
      let row: driver4UsherSuggest = {
        home: '',
        id: '',
        lastCallDays: 0,
        lastRideDays: 0,
        mobile: '',
        name: '',
        reason: '',
        freeSeats: 0,
        isMatchPrefs: false,
        seats: 0,
      };
      drivers.push(row);
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
        .and(r.isHasDriver() ? new Filter(() => { true }) : new Filter(() => { false }))
    })) {
      let row: driver4UsherSuggest = {
        home: '',
        id: '',
        lastCallDays: 0,
        lastRideDays: 0,
        mobile: '',
        name: '',
        reason: '',
        freeSeats: 0,
        isMatchPrefs: false,
        seats: 0,
      };
      drivers.push(row);
    }
    return drivers;
  }

}
