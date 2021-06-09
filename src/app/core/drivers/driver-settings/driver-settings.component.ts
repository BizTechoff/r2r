import { Component, OnInit } from '@angular/core';
import { RouteHelperService } from '@remult/angular';
import { Context } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { LocationAreaComponent } from '../../locations/location-area/location-area.component';
import { Driver } from '../driver';
import { DriverPrefs } from '../driverPrefs';

@Component({
  selector: 'app-driver-settings',
  templateUrl: './driver-settings.component.html',
  styleUrls: ['./driver-settings.component.scss']
})
export class DriverSettingsComponent implements OnInit {

  args: {
    driverId: string,
  };
  selectedCount = 0;

  constructor(
    private context: Context,
    private routeHelper: RouteHelperService,
    private snakebar: DialogService) { }

  driverSettings = this.context.for(Driver).gridSettings({
    numOfColumnsInGrid: 0,
    allowUpdate: true,
    where: d => d.userId.isEqualTo(this.context.user.id),
    columnSettings: d => [
      d.name, d.hebName,
      d.mobile, d.email,
      d.idNumber, d.birthDate,
      d.seats,
      d.city, d.address,
    ],

  });

  driverLocations;


  async openPreferedBorders() {

    if (!(this.args)) {
      this.args = { driverId: '' };
    }
    if (!(this.args.driverId && this.args.driverId.length > 0)) {
      this.args.driverId = (await this.context.for(Driver).findFirst(d => d.userId.isEqualTo(this.context.user.id))).id.value;
    }
    await this.context.openDialog(LocationAreaComponent, dlg => dlg.args = { dId: this.args.driverId });

    this.selectedCount = await this.context.for(DriverPrefs).count(
      prf => prf.did.isEqualTo(this.driverId));
  }
  driverId;
  async ngOnInit() {
    this.driverSettings.reloadData().then(() => {
    });

    this.driverId = (await this.context.for(Driver).findFirst({
      where: d => d.userId.isEqualTo(this.context.user.id),
    })).id.value;

    this.selectedCount = await this.context.for(DriverPrefs).count(
      prf => prf.did.isEqualTo(this.driverId));
  }

  async update() {
    let prefs = await this.context.for(DriverPrefs).find({
      where: pf => pf.did.isEqualTo(this.driverId),
    });
    if (prefs && prefs.length > 0) {
      if (this.driverSettings.items.length > 0) {
        await this.driverSettings.items[0].save();
        this.snakebar.info("Your Personal Info Succefully Saved");
        // this.routeHelper.navigateToComponent(dri))
      }
    }
    else {
      this.snakebar.info("Must have at least 1 prefered borders.");
    }
  }

}
