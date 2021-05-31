import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, StringColumn, ValueListItem } from '@remult/core';
import { DialogService } from '../../common/dialog';
import { GridDialogComponent } from '../../common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { Roles } from '../../users/roles';
import { Ride } from '../rides/ride';
import { addDays, Usher } from '../usher/usher';
import { Patient } from './patient';
import { PatientCrudComponent } from './patient-crud/patient-crud.component';


@Component({
  selector: 'app-patients',
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.scss']
})
export class PatientsComponent implements OnInit {


  search = new StringColumn({
    caption: 'search patient name',
    valueChange: () => this.busy.donotWait(async () => this.retrievePatients())

  });
  // patients: Patient[];
  patientsSettings = this.context.for(Patient).gridSettings({
    where: p => this.search.value ? p.name.isContains(this.search) : undefined,
    caption: "Patients",
    confirmDelete: (p) => this.dialog.confirmDelete(p.name.value),
    allowCRUD: false,
    numOfColumnsInGrid: 10,
    columnSettings: p => [
      p.name,
      // p.hebName,
      p.mobile,
      // p.idNumber,
      // p.defaultBorder,
      // p.defaultHospital,
    ],
    gridButtons: [{
      name: 'Add New Patient',
      icon: 'add',
      // cssClass: 'color="primary"',
      click: async () => {
        await this.addPatient();
      }
    }],
    rowButtons: [{
      textInMenu: "Add Ride",
      click: async (p) => await this.openAddRideDialog(p),
      icon: "directions_bus_filled",
      visible: (d) => !d.isNew(),
      showInLine: true,
    }, {
      textInMenu: "Schedule Rides",
      click: async (p) => await this.openScheduleRides(p),
      icon: "departure_board",
      visible: (d) => !d.isNew(),
      showInLine: true,
    }, {
      textInMenu: "______________________",//seperator
    }, {
      textInMenu: "Edit Patient",
      icon: "edit",
      visible: (p) => !p.isNew(),
      click: async (p) => {
        await this.editPatient(p);
      },
    }, {
      textInMenu: "Delete Patient",
      icon: "delete",
      visible: (p) => !p.isNew(),
      click: async (p) => {
        let name = (await this.context.for(Patient).findId(p.id.value)).name.value;
        if (await this.dialog.confirmDelete(name)) {
          await p.delete();
        }
      },
    },],
  });

  constructor(private context: Context, private busy: BusyService, private dialog: DialogService) {
  }

  ngOnInit() {
    console.log("ngOnInit");
    this.retrievePatients();
  }



  async retrievePatients() {
    this.patientsSettings.reloadData();
    // this.patients = await this.context.for(Patient).find({
    //   where:p=>this.search.value?p.name.isContains(this.search):undefined
    // });
  }

  async addPatient() {
    await this.context.openDialog(PatientCrudComponent, thus => thus.args = {
      pid: ''
    });
    // let changed = await openPatient('', this.context);
    // var patient = this.context.for(Patient).create();
    // this.context.openDialog(
    //   InputAreaComponent,
    //   x => x.args = {
    //     title: "Add New Patient",
    //     columnSettings: () => [
    //       [patient.name, patient.hebName],
    //       [patient.mobile, patient.idNumber],
    //       [patient.defaultBorder, patient.defaultHospital],
    //     ],
    //     ok: async () => {
    //       //PromiseThrottle
    //       // ride.driverId.value = undefined;
    //       await patient.save();
    //       // this.patientsSettings.items.push(patient);
    //       this.retrievePatients();
    //     }
    //   },
    // )
  }

  async editPatient(p: Patient) {
    if (await this.context.openDialog(PatientCrudComponent, thus => thus.args = {
      pid: p.id.value
    })) {
      await p.reload();
    }
    // let changed = await openPatient(p.id.value, this.context);
  }

  async editRide(r: Ride) {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    let tomorrow10am = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10);

    // var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: `Edit Ride: (${r.status.value.id})`,// ${p.name.value} (age: ${p.age.value})`,
        columnSettings: () => [
          { column: r.fid },
          { column: r.tid },
          [
            { column: r.date },
            { column: r.visitTime }
          ],
          { column: r.escortsCount },
          [
            r.isHasBabyChair,
            r.isHasWheelchair
          ],
          // { column: ride.dRemark, readOnly: true },
          // { column: r.rRemark, readOnly: true, caption: 'Remark' },
          r.rRemark,
          r.dRemark,
        ],
        // buttons: [{
        //   text: 'Patient Details',
        //   click: async () => { await this.editPatient(p); }
        // }
        // ],
        validate: async () => {
          if (!(r.fid.value && r.fid.value.length > 0)) {
            r.fid.validationError = 'Required';
            throw r.fid.defs.caption + ' ' + r.fid.validationError;
          }
          if (!(r.tid.value && r.tid.value.length > 0)) {
            r.tid.validationError = 'Required';
            throw r.tid.defs.caption + ' ' + r.tid.validationError;
          }
          if (!(r.isHasDate())) {
            r.date.validationError = 'Required';
            throw r.date.defs.caption + ' ' + r.date.validationError;
          }
          if (r.date.value < addDays(0)) {
            r.date.validationError = 'Must be greater or equals today';
            throw r.date.defs.caption + ' ' + r.date.validationError;
          }
          if (!(r.isHasVisitTime())) {
            r.visitTime.validationError = 'Required';
            throw r.visitTime.defs.caption + ' ' + r.visitTime.validationError;
          }
        },
        ok: async () => {
          await r.save();
        }
      },
    )
  }

  async openScheduleRides(p: Patient) {

    let values: ValueListItem[] = [];
    // console.log(r.date);
    let rides = await Usher.getRegisteredRidesForPatient(p.id.value);
    for (const r of rides) {
      values.push({
        id: r.id,
        caption: r.from + '|' + r.to + '|' + formatDate(r.date, 'dd.MM.yyyy', 'en-US') + '|' + r.status.id,
      });
    };

    let today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());//dd/mm/yyyy 00:00:00.0

    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `${p.name.value}    (scheduled rides)`,
      settings: this.context.for(Ride).gridSettings({
        where: r => r.id.isIn(...rides.map(rm => rm.id)),
        // where: r => r.driverId.isEqualTo(d.id)
        //   .and(r.date.isGreaterOrEqualTo(today)),
        orderBy: r => [{ column: r.date, descending: true }],
        allowCRUD: false,// this.context.isAllowed([Roles.admin, Roles.usher, Roles.matcher]),
        allowDelete: false,
        showPagination: false,
        numOfColumnsInGrid: 10,
        columnSettings: r => [
          r.fid,
          r.tid,
          r.date,
          r.patientId,
          r.status,
          // r.driverId,//??
        ],
        rowButtons: [
          {
            textInMenu: 'Edit',
            icon: 'edit',
            click: async (r) => { await this.editRide(r); },
            visible: this.context.isAllowed([Roles.matcher]),//[Roles.admin, Roles.usher, Roles.matcher]),
          },
        ],
      }),
    });



    // console.table(relevantDrivers);
    // this.context.openDialog(GridDialogComponent, x => x.args({
    //   title: `Registered Rides (${rides.length})`,
    //   values: values,
    //   // orderBy:r => [{ column: r.date, descending: true }]
    //   onSelect: async x => {
    //     // let ride = await this.context.for(Ride).findId(x.item.id);
    //     // r.driverId.value = x.id;
    //     // r.status.value = RideStatus.waitingFor30Start,
    //     // await r.save();
    //     // this.snakebar.info(`Sending Sms To Driver: ${x.caption}`);
    //     // this.retrieveDrivers();
    //   },
    // }));
  }

  async openAddRideDialog(p: Patient) {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    let tomorrow10am = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10);

    var ride = this.context.for(Ride).create();
    ride.date.value = tomorrow;
    // ride.visitTime.value = tomorrow10am;
    // ride.dayOfWeek.value = DriverPrefs.getDayOfWeek(ride.date.getDayOfWeek());
    // ride.dayPeriod.value = DayPeriod.morning;
    ride.patientId.value = p.id.value;
    ride.fid.value = p.defaultBorder.value;
    ride.tid.value = p.defaultHospital.value;
    ride.pMobile.value = p.mobile.value;
    // var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: `Add Ride For: ${p.name.value} (age: ${p.age.value})`,
        columnSettings: () => [
          ride.fid,
          ride.tid,
          [ride.date, ride.visitTime],
          [ride.escortsCount, ride.pMobile],
          [ride.isHasBabyChair, ride.isHasWheelchair],
          ride.rRemark,
          ride.dRemark,
        ],
        buttons: [{
          text: 'Patient Details',
          click: async () => { await this.editPatient(p); }
        }
        ],
        validate: async () => {
          if (!(ride.fid.value && ride.fid.value.length > 0)) {
            ride.fid.validationError = 'Required';
            throw ride.fid.defs.caption + ' ' + ride.fid.validationError;
          }
          if (!(ride.tid.value && ride.tid.value.length > 0)) {
            ride.tid.validationError = 'Required';
            throw ride.tid.defs.caption + ' ' + ride.tid.validationError;
          }
          if (!(ride.isHasDate())) {
            ride.date.validationError = 'Required';
            throw ride.date.defs.caption + ' ' + ride.date.validationError;
          }
          if (ride.date.value < addDays(0)) {
            ride.date.validationError = 'Must be greater or equals today';
            throw ride.date.defs.caption + ' ' + ride.date.validationError;
          }
          if (!(ride.isHasVisitTime())) {
            ride.visitTime.validationError = 'Required';
            throw ride.visitTime.defs.caption + ' ' + ride.visitTime.validationError;
          }
        },
        ok: async () => {
          await ride.save();
        }
      },
    )
  }

}
