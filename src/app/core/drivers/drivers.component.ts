import { Component, OnInit } from '@angular/core';
import { BusyService, SelectValueDialogComponent } from '@remult/angular';
import { Context, StringColumn, ValueListItem } from '@remult/core';
import { GridDialogComponent } from '../../common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { Ride } from '../rides/ride';
import { Usher } from '../usher/usher';
import { Driver } from './driver';
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
    allowCRUD: true,
    rowButtons: [{
      name: "Preferences",
      click: async (d) => await this.openPreferencesDialog(d),
      icon: "settings_suggest",
      visible: (d) => !d.isNew(),
      //showInLine: (this.context.for(DriverPrefs).count(p => p.driverId.isEqualTo("")).then(() => { return true; })),
    }, {
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
    },],
    gridButtons: [{
      name: 'Add New Driver',
      icon: 'add',
      // cssClass: 'color="primary"',
      click: async () => {
        await this.addDriver();
      }

    },],
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
      d.defaultFromTime,
      d.defaultToTime,
      //prefsCount, await this.context.for(DriverPrefs).count(p=>p.driverId.isEqualTo(d.id));
    ],
  });

  constructor(private context: Context, private busy: BusyService) { }


  ngOnInit() {
    this.retrieveDrivers();
  }
  async retrieveDrivers() {
    this.driversSettings.reloadData();
    // this.patients = await this.context.for(Patient).find({
    //   where:p=>this.search.value?p.name.isContains(this.search):undefined
    // });
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

  async openCallDocumentationDialog(p: Driver) {
  }

  async openScheduleDialog(p: Driver) {
  }

  async openPreferencesDialog(d: Driver) {

    this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: "Preferenses",
      settings: this.context.for(DriverPrefs).gridSettings({
        where: p => p.driverId.isEqualTo(d.id),
        newRow: p => p.driverId.value = d.id.value,
        allowCRUD: true,
        columnSettings: p => [
          p.locationId,
          p.dayOfWeek,
          p.dayPeriod,
        ],
      })
    });
  }

  async openSuggestedRidesForDriverDialog(d: Driver) {
    let suggestedRides = await Usher.getSuggestedRidesForDriver(d.id.value);

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
    }))

    // this.context.openDialog(GridDialogComponent, gd => gd.args = {
    //   title: "Relevent Rides",
    //   buttons: [{
    //     text: 'select',
    //     click: async () => { 
    //       gd.
    //       // getSelection().
    //       // await this.mergeFamilies(x); }
    //     }
    //   }],
    //   settings: this.context.for(Ride).gridSettings({
    //     where: r => r.id.isIn(...relevantRides),
    //     //where: p => p.id.isEqualTo(d.id),
    //     // newRow: p => p.driverId.value = d.id.value,
    //     // allowCRUD: true,
    //     numOfColumnsInGrid: 10,
    //     columnSettings: r => [
    //       r.driverId,
    //       r.dayOfWeek,
    //       r.dayPeriod,
    //       r.patientId,
    //       r.from,
    //       r.to,
    //     ],
    //     allowSelection: true,
    //   }),

    // });
  }

}
