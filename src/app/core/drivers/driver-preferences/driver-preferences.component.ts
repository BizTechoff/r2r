import { Component, OnInit } from '@angular/core';
import { RouteHelperService } from '@remult/angular';
import { Context, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { Driver } from '../driver';
import { DriverPrefs } from '../driverPrefs';

@Component({
  selector: 'app-driver-preferences',
  templateUrl: './driver-preferences.component.html',
  styleUrls: ['./driver-preferences.component.scss']
})
export class DriverPreferencesComponent implements OnInit {

  args: {
    driverId: string,
  };

  constructor(
    private context: Context,
    private routeHelper: RouteHelperService,
    private snakebar: DialogService) {
  }

  prefs = this.context.for(DriverPrefs).gridSettings({
    numOfColumnsInGrid: 10,
    allowUpdate: true,
    where: pf => pf.driverId.isEqualTo(this.args.driverId),
    columnSettings: pf => [
      pf.locationId,
      pf.dayOfWeek,
      pf.dayPeriod,
      // [d.name, d.hebName],
      // [d.mobile, d.email],
      // [d.idNumber, d.birthDate],
      // [d.home, d.seats],
      // [d.city, d.address],
    ],

  });

  ngOnInit() {

    // this.args.driverId = this.context.user.id;
    this.args = { driverId: this.context.user.id };

    this.prefs.reloadData().then(() => { });

    if(this.prefs.items.length == 0){
      this.prefs.addArea({ columnSettings: pf => [ new StringColumn({caption: "Found no records" })]});
    }
    // console.log(this.args.driverId);

    // console.log(11);
    // let driver = this.context.for(Driver).findFirst(
    //   d => d.userId.isEqualTo(this.context.user.id)
    // ).then( (d) => {this.args.driverId = d.id.value});

    // this.prefs.reloadData().then(() => {
    // });
    // console.log(driver);
    // if (driver && driver.id && driver.id.value) {
    //   this.args.driverId = driver.id.value;
    //   console.log(this.args.driverId);

    //   this.prefs.reloadData().then(() => {
    //   });
    // }

  }

  async update() {
    if (this.prefs.items.length > 0) {
      this.prefs.items[0].save();
      this.snakebar.info("Your Preferences Succefully Saved");
      // this.routeHelper.navigateToComponent(dri))
    }
  }

}
