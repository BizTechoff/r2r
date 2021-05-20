import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BusyService, SelectValueDialogComponent } from '@remult/angular';
import { BoolColumn, Context, StringColumn, ValueListItem } from '@remult/core';
import { DialogService } from '../../common/dialog';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { DayPeriod, DriverPrefs } from '../drivers/driverPrefs';
import { Ride } from '../rides/ride';
import { Usher } from '../usher/usher';
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
      pid: '', isNew: false,
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
    if(await this.context.openDialog(PatientCrudComponent, thus => thus.args = {
      pid: p.id.value, isNew: false,
    })){
      await p.reload();
    }
    // let changed = await openPatient(p.id.value, this.context);
  }

  async openScheduleRides(p: Patient) {

    let values: ValueListItem[] = [];
    // console.log(r.date);
    let rides = await Usher.getRegisteredRidesForPatient(p.id.value);
    for (const r of rides) {
      values.push({
        id: r.id,
        caption: r.toString(),
      });
    };
    // console.table(relevantDrivers);
    this.context.openDialog(SelectValueDialogComponent, x => x.args({
      title: `Registered Rides (${rides.length})`,
      values: values,
      // orderBy:r => [{ column: r.date, descending: true }]
      onSelect: async x => {
        // let ride = await this.context.for(Ride).findId(x.item.id);
        // r.driverId.value = x.id;
        // r.status.value = RideStatus.waitingFor30Start,
        // await r.save();
        // this.snakebar.info(`Sending Sms To Driver: ${x.caption}`);
        // this.retrieveDrivers();
      },
    }));
  }

  async openAddRideDialog(p: Patient) {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    let tomorrow10am = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10);

    var ride = this.context.for(Ride).create();
    ride.date.value = tomorrow;
    ride.visitTime.value = tomorrow10am;
    ride.dayOfWeek.value = DriverPrefs.getDayOfWeek(ride.date.getDayOfWeek());
    ride.dayPeriod.value = DayPeriod.morning;
    ride.patientId.value = p.id.value;
    ride.fromLocation.value = p.defaultBorder.value;
    ride.toLocation.value = p.defaultHospital.value;
    ride.pMobile.value = p.mobile.value;
    // var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: `Add Ride For: ${p.name.value} (age: ${p.age()})`,
        columnSettings: () => [
          ride.fromLocation,
          ride.toLocation,
          ride.date, {
            column: ride.dayPeriod,
            valueList: [DayPeriod.morning, DayPeriod.afternoon],
          },
          // {
          //   column: isNeedReturnTrip,
          //   visible: (r) => ride.dayPeriod.value == DayPeriod.morning,
          // },
          {
            column: ride.visitTime,
            visible: (r) => ride.dayPeriod.value == DayPeriod.morning,
            displayValue: ride.isHasVisitTime() ? formatDate(ride.visitTime.value, "HH:mm", 'en-US') : "",
          },
          ride.isHasBabyChair,
          ride.isHasWheelchair,
          // ride.isHasExtraEquipment,
          ride.escortsCount,
          {
            column: ride.dRemark,
            caption: 'Remark For Driver',
          },
          {
            column: ride.rRemark,
            caption: 'Remark For Ride',
          },
        ],
        buttons: [{
          text: 'Patient Details',
          click: async () => { await this.editPatient(p); }
        }
        ],
        ok: async () => {
          await ride.save();
          // if (isNeedReturnTrip.value && ride.dayPeriod.value == DayPeriod.morning) {
          //   var returnRide = this.context.for(Ride).create();
          //   ride.copyTo(returnRide);
          //   returnRide.fromLocation.value = ride.toLocation.value;
          //   returnRide.toLocation.value = ride.fromLocation.value;
          //   returnRide.dayPeriod.value = DayPeriod.afternoon;
          //   await returnRide.save();
          // }
        }
      },
    )
  }
}

