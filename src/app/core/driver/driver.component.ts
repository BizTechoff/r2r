import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings } from '@remult/core';
import { DrivingMatcher } from '../driving/drivingMatcher';
import { Driver } from './driver';

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.scss']
})
export class DriverComponent implements OnInit {

  driver = this.context.for(Driver).create();
  driverSettings = new DataAreaSettings({
    columnSettings: () => [
      this.driver.name,
      this.driver.mobile,
    ]
  });
  driverMatches = this.context.for(DrivingMatcher).create();
  driverMatchesSettings = this.context.for(DrivingMatcher).gridSettings({
    columnSettings: () => [
      //this.driverMatches.hospital,
      //this.driverMatches.borderCrossing,
      this.driverMatches.fromday,
      this.driverMatches.today,
      this.driverMatches.fromHour,
      this.driverMatches.toHour,
    ],
    newRow: () => {
      this.driverMatches.driverId.value =
        this.driver.id.value;
    },
  });

  constructor(private context: Context) { }

  ngOnInit() {
  }

  async submit() {
    await this.driver.save();
    await this.driverMatches.save();
  }

}
