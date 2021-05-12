import { Component, OnInit } from '@angular/core';
import { Context, Filter } from '@remult/core';
import { driver4UsherSuggest } from '../../../shared/types';
import { Driver } from '../../drivers/driver';
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
    this.refresh();
  }

  async refresh() {
    this.drivers = await SuggestDriverComponent.retrieve(
      this.args.rId
    );
  }

  static async retrieve(rId: string, context?: Context) {
    let drivers: driver4UsherSuggest[] = [];

    let ride = await context.for(Ride).findId(rId);

    //1. drivers with same locations
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
      };
      drivers.push(row);
    };

    //2. drivers with same prefered locations.

    //3. drivers with same locations for last 3 months.

    //4. drivers did ride with same area locations.

    //5. drivers not did ride for last 7 days.

    for await (const d of context.for(Driver).iterate({
      
    })) {

    }

    return drivers;
  }

}
