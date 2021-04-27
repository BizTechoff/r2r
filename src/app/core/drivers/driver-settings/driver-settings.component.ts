import { Component, OnInit } from '@angular/core';
import { RouteHelperService } from '@remult/angular';
import { Context } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
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
      /*d.home*/, d.seats,
      d.city, d.address,
      // [d.name, d.hebName],
      // [d.mobile, d.email],
      // [d.idNumber, d.birthDate],
      // [d.home, d.seats],
      // [d.city, d.address],
    ],

  });

  driverLocations ;

async preferedBorders(){

  // this.context.openDialog(GridDialogComponent, gd => gd.args = {
  //   title: "Prefered Borders",
  //   // cancel: () => {this.snakebar.info("Closed")},
  //   settings: this.context.for(Location).gridSettings({
  //     allowSelection: true,
  //     where: l => l.type.isEqualTo(LocationType.border),
  //     allowCRUD: false,
  //   })
  // });

  this.context.openDialog(GridDialogComponent, gd => gd.args = {
    title: "Prefered Borders",
    settings: this.context.for(DriverPrefs).gridSettings({
      where: p => p.driverId.isEqualTo(this.driverId),
      newRow: p => p.driverId.value = this.driverId,
      allowCRUD: true,
      columnSettings: p => [
        p.locationId,
        // p.dayOfWeek,
        // p.dayPeriod,
      ],
    })
  });
}
driverId;
  async ngOnInit() {
    this.driverSettings.reloadData().then(() => {
    });

    this.driverId = (await this.context.for(Driver).findFirst({
        where: d=>d.userId.isEqualTo(this.context.user.id),
      })).id.value;

    // let driverId = (await this.context.for(Driver).findFirst({
    //   where: d=>d.userId.isEqualTo(this.context.user.id),
    // })).id.value;

    // this.driverLocations = await this.context.for(DriverPrefs).find({
    //   where: pf => pf.driverId.isEqualTo(driverId),
    // });
  }

  async update() {
    let prefs = await this.context.for(DriverPrefs).find({
      where: pf => pf.driverId.isEqualTo(this.driverId),
    });
    if(prefs && prefs.length > 0)
{
    if (this.driverSettings.items.length > 0) {
      this.driverSettings.items[0].save();
      this.snakebar.info("Your Personal Info Succefully Saved");
      // this.routeHelper.navigateToComponent(dri))
    }
  }
  else{
    this.snakebar.info("Must have at least 1 prefered borders.");
  }
  }

}
