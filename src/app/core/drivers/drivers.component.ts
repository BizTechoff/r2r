import { Component, OnInit } from '@angular/core';
import { BusyService, SelectValueDialogComponent } from '@remult/angular';
import { Context, ServerFunction, StringColumn, ValueListItem } from '@remult/core';
import { DialogService } from '../../common/dialog';
import { GridDialogComponent } from '../../common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { Roles } from '../../users/roles';
import { LocationAreaComponent } from '../locations/location-area/location-area.component';
import { Ride, RideStatus } from '../rides/ride';
import { Usher } from '../usher/usher';
import { Driver, openDriver } from './driver';
import { DriverCall } from './driverCall';
import { DriverPrefs } from './driverPrefs';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.scss']
})
export class DriversComponent implements OnInit {

  search = new StringColumn({
    caption: 'search driver name',
    valueChange: () => this.busy.donotWait(async () => this.retrieveDrivers())

  });

  // prefsCount = new NumberColumn({});
  driversSettings = this.context.for(Driver).gridSettings({
    where: p => this.search.value ? p.name.isContains(this.search) : undefined,
    numOfColumnsInGrid: 10,
    // allowSelection: true,
    columnSettings: (d) => [
      // d.name,
      // {
      //   column: this.prefsCount,
      //   // getValue:async() => await this.context.for(DriverPrefs).count(p=>p.driverId.isEqualTo(d.id)),
      // },
      d.name,
      d.idNumber,
      d.birthDate,
      d.seats,
      d.mobile,
      d.email,
      d.home,
      d.defaultFromTime,
      d.defaultToTime,
      //prefsCount, await this.context.for(DriverPrefs).count(p=>p.driverId.isEqualTo(d.id));
    ],
    allowCRUD: false,
    rowButtons: [{
      name: "Suggest Rides",
      click: async (d) => await this.openSuggestedRidesForDriverDialog(d),
      icon: "directions_bus_filled",
      visible: (d) => !d.isNew(),
      //showInLine: (this.context.for(DriverPrefs).count(p => p.driverId.isEqualTo("")).then(() => { return true; })),
    }, {
      name: "Call Documentation",
      click: async (d) => await this.openCallDocumentationDialog(d),
      icon: "tty",
      visible: (d) => !d.isNew(),
      //showInLine: (this.context.for(DriverPrefs).count(p => p.driverId.isEqualTo("")).then(() => { return true; })),
    }, {
      textInMenu: "______________________",//seperator
    }, {
      name: "Prefered Borders",
      click: async (d) => await this.openPreferencesDialog(d),
      icon: "settings_suggest",
      visible: (d) => !d.isNew(),
      //showInLine: (this.context.for(DriverPrefs).count(p => p.driverId.isEqualTo("")).then(() => { return true; })),
    }, {
      textInMenu: "______________________",//seperator
    }, {
      textInMenu: "Edit Driver",
      icon: "edit",
      visible: (p) => !p.isNew(),
      click: async (p) => {
        await this.editDriver(p);
      },
    }, {
      textInMenu: "Delete Driver",
      icon: "delete",
      visible: (p) => !p.isNew(),
      click: async (p) => {
        let name = (await this.context.for(Driver).findId(p.id.value)).name.value;
        if (await this.dialog.confirmDelete(name)) {
          await p.delete();
        }
      },
    },],
    gridButtons: [{
      name: 'Add New Driver',
      icon: 'add',
      // cssClass: 'color="primary"',
      click: async () => {
        await this.addDriver();
      }

    },],
  });

  constructor(private context: Context, private busy: BusyService, private dialog: DialogService) { }


  ngOnInit() {
    this.retrieveDrivers();
  }
  async retrieveDrivers() {
    this.driversSettings.reloadData();
    // this.patients = await this.context.for(Patient).find({
    //   where:p=>this.search.value?p.name.isContains(this.search):undefined
    // });
  }

  async editDriver(d: Driver) {
    await openDriver(d.id.value, this.context);
  }

  async addDriver() {
    var driver = this.context.for(Driver).create();
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Add New Driver",
        columnSettings: () => [
          [driver.name, driver.hebName],
          [driver.mobile, driver.email],
          [driver.idNumber, driver.birthDate],
          [driver.home, driver.seats],
          [driver.city, driver.address],
        ],
        ok: async () => {
          await driver.save();
          this.retrieveDrivers();
          //PromiseThrottle 
          // ride.driverId.value = undefined;
          // await driver.save();
          // // this.patientsSettings.items.push(patient);
          // this.retrieveDrivers();
        }
      },
    )
  }

  async openCallDocumentationDialog(d: Driver) {
    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `Call Documentation For ${d.name.value}`,
      settings: this.context.for(DriverCall).gridSettings({
        where: c => c.dId.isEqualTo(d.id),
        orderBy: c => [{ column: c.modified.value ? c.modified : c.created, descending: true }, { column: c.created.value ? c.created : c.modified, descending: true }],
        newRow: c => { c.dId.value = d.id.value; },
        allowCRUD: this.context.isAllowed([Roles.admin, Roles.usher]),
        allowDelete: false,
        numOfColumnsInGrid: 10,
        columnSettings: c => [
          c.doc,
          { column: c.created, readOnly: true },
          { column: c.modified, readOnly: true },
        ],
      }),
    });
  }

  async openScheduleDialog(p: Driver) {
  }

  async openPreferencesDialog(d: Driver) {

    await this.context.openDialog(LocationAreaComponent, thus => thus.args = { dId: d.id.value });

    // this.context.openDialog(GridDialogComponent, gd => gd.args = {
    //   title: "Preferenses",
    //   settings: this.context.for(DriverPrefs).gridSettings({
    //     where: p => p.driverId.isEqualTo(d.id),
    //     newRow: p => p.driverId.value = d.id.value,
    //     allowCRUD: true,
    //     columnSettings: p => [
    //       p.locationId,
    //       p.dayOfWeek,
    //       p.dayPeriod,
    //     ],
    //   })
    // });
  }

  async openSuggestedRidesForDriverDialog(d: Driver) {
    let suggestedRides = await Usher.getSuggestedRidesForDriver(d.id.value);
    suggestedRides = [];
    let rIds = await DriversComponent.suggestRidesForMe(d.id.value, this.context);
    for await (const row of this.context.for(Ride).iterate({
      where: r => r.id.isIn(...rIds.map(itm => itm.rid)),
    })) {
      suggestedRides.push({
        id: row.id.value,
        date: row.date.value,
        from: row.fromLocation.value,
        to: row.toLocation.value,
        passengers: row.passengers(),
        phones: '',
        groupByLocation: false,
        icons: [],
        ids: [],
        isWaitingForArrived: row.isWaitingForArrived(),
        isWaitingForPickup: row.isWaitingForPickup(),
        isWaitingForStart: row.isWaitingForStart(),
        isWaitingForUsherApproove: row.isWaitingForUsherApproove(),
      });
    }

    let values: ValueListItem[] = [];
    for (const ride of suggestedRides) {
      let caption = `${ride.date} | ${ride.from} | ${ride.to} | ${ride.passengers} | ${ride.phones}`;
      values.push({
        id: ride.id,
        caption: caption
      });
    }

    this.context.openDialog(SelectValueDialogComponent, x => x.args({
      title: `Suggested Rides`,
      values: values,
      onSelect: async x => {
        let ride = await this.context.for(Ride).findId(x.id);
        ride.driverId.value = d.id.value;
        await ride.save();
        // this.retrieveDrivers();
      },
    }));
  }

  static async getBordersIds(did: string, context?: Context): Promise<string[]> {
    let borders: string[] = [];
    for await (const pref of await context.for(DriverPrefs).iterate({
      where: pf => pf.driverId.isEqualTo(did),
    })) {
      borders.push(pref.locationId.value);
    }
    return borders;
  }

  @ServerFunction({ allowed: [Roles.admin, Roles.usher] })
  static async suggestRidesForMe(did: string, context?: Context) {
    let result: {
      rid: string,
    }[] = [];

    let borders = await DriversComponent.getBordersIds(did, context);
    for await (const ride of context.for(Ride).iterate({
      where: r => r.fromLocation.isIn(...borders)
        .and(r.status.isIn(RideStatus.waitingForDriver)),
    })) {
      result.push({ rid: ride.id.value });
    }

    return result;
  }

}
