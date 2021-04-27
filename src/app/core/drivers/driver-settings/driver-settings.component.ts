import { Component, OnInit } from '@angular/core';
import { RouteHelperService } from '@remult/angular';
import { Context } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { Driver } from '../driver';

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

  driver = this.context.for(Driver).gridSettings({
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

  ngOnInit() {
    this.driver.reloadData().then(() => {
    });
  }

  async update() {
    if (this.driver.items.length > 0) {
      this.driver.items[0].save();
      this.snakebar.info("Your Personal Info Succefully Saved");
      // this.routeHelper.navigateToComponent(dri))
    }
  }

}
