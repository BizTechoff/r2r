import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, NumberColumn, ServerFunction, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { FILTER_IGNORE } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { LocationAreaComponent } from '../../locations/location-area/location-area.component';
import { Ride, RideStatus } from '../../rides/ride';
import { DriverCrudComponent } from '../driver-crud/driver-crud.component';
import { Driver, openDriverRides } from './../driver';
import { DriverCall } from './../driverCall';
import { DriverPrefs } from './../driverPrefs';

@Component({
  selector: 'app-drivers-list',
  templateUrl: './drivers-list.component.html',
  styleUrls: ['./drivers-list.component.scss']
})
export class DriversListComponent implements OnInit {

  search = new StringColumn({
    dataControlSettings: () => ({ clickIcon: 'search', click: async () => await this.retrieveDrivers() }),
    caption: 'Search here for driver name',
    valueChange: () => this.busy.donotWait(async () => this.retrieveDrivers())

  });

  prefsCount = new NumberColumn({ caption: "Prefs Count" });
  driversSettings = this.context.for(Driver).gridSettings({
    where: cur => cur.uid.isDifferentFrom('')
      .and(this.search.value ? cur.name.isContains(this.search) : FILTER_IGNORE),
    numOfColumnsInGrid: 10,
    // allowSelection: true,
    columnSettings: (cur) => [
      cur.name,
      cur.idNumber,
      cur.mobile,
      cur.seats,
      cur.city,
      cur.birthDate,
      cur.email//,
      // cur.defaultFromTime,
      // cur.defaultToTime
      // ,
      // {
      //   column: this.prefsCount,
      //   getValue: async (d) => {
      //     return await this.context.for(DriverPrefs).count(prf => prf.did.isEqualTo(d.id));
      //   }
      // }
    ],
    allowCRUD: false,
    rowButtons: [{
      name: "Show Rides",
      click: async (cur) => await this.openScheduleRides(cur),
      icon: "directions_bus_filled",
      visible: (cur) => !cur.isNew(),
      //showInLine: (this.context.for(DriverPrefs).count(p => p.driverId.isEqualTo("")).then(() => { return true; })),
    }, {
      name: "Call Documentation",
      click: async (cur) => await this.openCallDocumentationDialog(cur),
      icon: "tty",
      visible: (cur) => !cur.isNew(),
      //showInLine: (this.context.for(DriverPrefs).count(p => p.driverId.isEqualTo("")).then(() => { return true; })),
    }, {
      textInMenu: "______________________",//seperator
    }, {
      name: "Prefered Borders",
      click: async (cur) => await this.openPreferencesDialog(cur),
      icon: "settings_suggest",
      visible: (cur) => !cur.isNew(),
      //showInLine: (this.context.for(DriverPrefs).count(p => p.driverId.isEqualTo("")).then(() => { return true; })),
    }, {
      textInMenu: "______________________",//seperator
    }, {
      textInMenu: "Edit Driver",
      icon: "edit",
      visible: (cur) => !cur.isNew(),
      click: async (cur) => {
        await this.openDriver(cur);
      },
    }]
  });

  constructor(private context: Context, private busy: BusyService, private dialog: DialogService) { }


  ngOnInit() {
    this.retrieveDrivers();
  }
  async retrieveDrivers() {
    this.driversSettings.reloadData();
  }

  async openDriver(d: Driver) {
    let changed = await this.context.openDialog(DriverCrudComponent,
      dlg => dlg.args = { did: d.id.value, },// input params
      dlg => { if (dlg) return dlg.okPressed; });// output param;
    if (changed) {
      await this.retrieveDrivers();
    }
  }

  async addDriver() {
    var driver = this.context.for(Driver).create();
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Add New Driver",
        columnSettings: () => [
          [driver.name, driver.idNumber],
          [driver.mobile],
          [driver.seats, driver.birthDate],
          [driver.email],
          [driver.home,],
          [driver.city, driver.address],
        ],
        ok: async () => {
          await driver.save();
          this.retrieveDrivers();
        }
      },
    )
  }

  async openCallDocumentationDialog(d: Driver) {
    await DriverCall.openCallDocumentationDialog(this.context, d.id.value, d.name.value);
  }

  async openScheduleDialog(p: Driver) {
  }

  async openPreferencesDialog(d: Driver) {

    await this.context.openDialog(LocationAreaComponent, dlg => dlg.args = { dId: d.id.value });
  }

  async openScheduleRides(d: Driver) {
    await openDriverRides(d.id.value, this.context);
  }

  static async getBordersIds(did: string, context?: Context): Promise<string[]> {
    let borders: string[] = [];
    for await (const pref of await context.for(DriverPrefs).iterate({
      where: pf => pf.did.isEqualTo(did),
    })) {
      borders.push(pref.lid.value);
    }
    return borders;
  }

  @ServerFunction({ allowed: [Roles.admin, Roles.usher] })
  static async suggestRidesForMe(did: string, context?: Context) {
    let result: {
      rid: string,
    }[] = [];

    let borders = await DriversListComponent.getBordersIds(did, context);
    for await (const ride of context.for(Ride).iterate({
      where: r => r.fid.isIn(...borders)
        .and(r.status.isIn(RideStatus.w4_Driver)),
    })) {
      result.push({ rid: ride.id.value });
    }

    return result;
  }

}
