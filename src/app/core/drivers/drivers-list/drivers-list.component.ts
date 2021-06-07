import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, ServerFunction, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { Roles } from '../../../users/roles';
import { LocationAreaComponent } from '../../locations/location-area/location-area.component';
import { Ride, RideStatus } from '../../rides/ride';
import { Driver, openDriver } from './../driver';
import { DriverCall } from './../driverCall';
import { DriverPrefs } from './../driverPrefs';

@Component({
  selector: 'app-drivers-list',
  templateUrl: './drivers-list.component.html',
  styleUrls: ['./drivers-list.component.scss']
})
export class DriversListComponent implements OnInit {

  search = new StringColumn({
    caption: 'Search here for driver name',
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
      name: "Show Rides",
      click: async (d) => await this.openScheduleRides(d),
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
    },
      // {
      //   textInMenu: "Delete Driver",
      //   icon: "delete",
      //   visible: (p) => !p.isNew(),
      //   click: async (p) => {
      //     let name = (await this.context.for(Driver).findId(p.id.value)).name.value;
      //     if (await this.dialog.confirmDelete(name)) {
      //       await p.delete();
      //     }
      //   },
      // },
    ],
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
    await DriverCall.openCallDocumentationDialog(this.context, d.id.value, d.name.value);
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

  async openScheduleRides(d: Driver) {

    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `${d.name.value} Rides`,
      settings: this.context.for(Ride).gridSettings({
        where: r => r.driverId.isEqualTo(d.id),
        orderBy: r => [{ column: r.date, descending: false }],
        allowCRUD: false,// this.context.isAllowed([Roles.admin, Roles.usher, Roles.matcher]),
        allowDelete: false,
        // showPagination: false,
        numOfColumnsInGrid: 10,
        columnSettings: r => [
          r.fid,
          r.tid,
          r.date,
          r.patientId,
          r.status,
        ],
        // rowButtons: [
        //   {
        //     textInMenu: 'Edit',
        //     icon: 'edit',
        //     click: async (r) => { await this.editRide(r); },
        //   },
        // ],
      }),
    });
  }


  // async editRide(r:Ride){
  //   let today = new Date();
  //   let tomorrow = new Date();
  //   tomorrow.setDate(today.getDate() + 1);
  //   let tomorrow10am = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10);

  //   // var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
  //   await this.context.openDialog(
  //     InputAreaComponent,
  //     x => x.args = {
  //       title: `Edit Ride: (${r.status.value.id})`,// ${p.name.value} (age: ${p.age.value})`,
  //       columnSettings: () => [
  //         r.fid,
  //         r.tid,
  //         r.date, 
  //         // r.dayPeriod,
  //         r.visitTime,
  //         r.isHasBabyChair,
  //         r.isHasWheelchair,
  //         r.escortsCount,
  //         r.dRemark,
  //         r.rRemark,
  //       ],
  //       // buttons: [{
  //       //   text: 'Patient Details',
  //       //   click: async () => { await this.editPatient(p); }
  //       // }
  //       // ],
  //       validate: async () => {
  //         if (!(r.fid.value && r.fid.value.length > 0)) {
  //           r.fid.validationError = 'Required';
  //           throw r.fid.defs.caption + ' ' + r.fid.validationError;
  //         }
  //         if (!(r.tid.value && r.tid.value.length > 0)) {
  //           r.tid.validationError = 'Required';
  //           throw r.tid.defs.caption + ' ' + r.tid.validationError;
  //         }
  //         if (!(r.isHasDate())) {
  //           r.date.validationError = 'Required';
  //           throw r.date.defs.caption + ' ' + r.date.validationError;
  //         }
  //         if (r.date.value < addDays(TODAY)) {
  //           r.date.validationError = 'Must be greater or equals today';
  //           throw r.date.defs.caption + ' ' + r.date.validationError;
  //         }
  //         if (!(r.isHasVisitTime())) {
  //           r.visitTime.validationError = 'Required';
  //           throw r.visitTime.defs.caption + ' ' + r.visitTime.validationError;
  //         }
  //       },
  //       ok: () => async () => {
  //         if (this.context.isAllowed(Roles.admin)) {
  //           await r.save();
  //         }
  //         else {
  //           this.dialog.info("Not Allowed");
  //         }
  //       },
  //     },
  //   )
  // }

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

    let borders = await DriversListComponent.getBordersIds(did, context);
    for await (const ride of context.for(Ride).iterate({
      where: r => r.fid.isIn(...borders)
        .and(r.status.isIn(RideStatus.waitingForDriver)),
    })) {
      result.push({ rid: ride.id.value });
    }

    return result;
  }

}
