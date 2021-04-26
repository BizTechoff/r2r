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
  } = {
      driverId: this.context.user.id
    };

  constructor(
    private context: Context,
    private routeHelper: RouteHelperService,
    private snakebar: DialogService) {
  }

  prefsSettings = this.context.for(DriverPrefs).gridSettings({
    numOfColumnsInGrid: 10,
    allowUpdate: true,
    where: pf => pf.driverId.isEqualTo(this.args.driverId),
    newRow: pf => pf.driverId.value = this.args.driverId,
    columnSettings: pf => [
      pf.locationId,
      pf.dayOfWeek,
      pf.dayPeriod,
    ],

  });

  async ngOnInit() {
    this.args.driverId = (await this.context.for(Driver).findFirst(
      d => d.userId.isEqualTo(this.context.user.id))).id.value;

    if (this.prefsSettings.items.length == 0) {
      this.prefsSettings.addArea({ columnSettings: pf => [new StringColumn({ caption: "Found no records" })] });
    }

    await this.prefsSettings.reloadData();
  }

  async update() {
    if (this.prefsSettings.items.length > 0) {
      this.prefsSettings.items[0].save();
      this.snakebar.info("Your Preferences Succefully Saved");
      // this.routeHelper.navigateToComponent(dri))
    }
  }

}
