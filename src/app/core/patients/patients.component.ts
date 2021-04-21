import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { BoolColumn, Context, StringColumn } from '@remult/core';
import { DialogService } from '../../common/dialog';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { Utils } from '../../shared/utils';
import { DayPeriod } from '../drivers/driverPrefSchedule';
import { Ride } from '../rides/ride';
import { ByDateColumn } from '../usher/ByDate';

import { Patient } from './patient';

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
    caption: "Patients",
    confirmDelete: (p) => this.dialog.confirmDelete(p.name.value),
    allowCRUD: true,
    gridButtons: [{
      name: 'Add New Patient',
      icon: 'add',
      // cssClass: 'color="primary"',
      click: async () => {
        await this.addPatient();
      }
    }],
    numOfColumnsInGrid: 10,
    columnSettings: p => [p.name, p.mobile, /*p.idNumber,*/ p.defaultBorderCrossing, p.defaultHospital],
    where: p => this.search.value ? p.name.isContains(this.search) : undefined,
    rowButtons: [{
      textInMenu: "Add Ride",
      click: async (p) => await this.openRideDialog(p),
      icon: "directions_bus_filled",
      visible: (d) => !d.isNew(),
      showInLine: true,
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
    var patient = this.context.for(Patient).create();
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Add New Patient",
        columnSettings: () => [
          [patient.name, patient.hebName],
          [patient.mobile, patient.idNumber],
          [patient.defaultBorderCrossing, patient.defaultHospital],
        ],
        ok: async () => {
          //PromiseThrottle
          // ride.driverId.value = undefined;
          await patient.save();
          // this.patientsSettings.items.push(patient);
          this.retrievePatients();
        }
      },
    )
  }

  async openRideDialog(p: Patient) {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    var ride = this.context.for(Ride).create();
    ride.date.value = tomorrow;
    ride.dayOfWeek.value = Utils.getDayOfWeek(ride.date.getDayOfWeek());
    ride.dayPeriod.value = DayPeriod.morning;
    ride.patientId.value = p.id.value;
    ride.from.value = p.defaultBorderCrossing.value;
    ride.to.value = p.defaultHospital.value;
    var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Ride For: " + p.name.value,
        columnSettings: () => [
          ride.from,
          ride.to,
          ride.date,
          ride.dayPeriod,
          {
            column: isNeedReturnTrip,
            visible: (r) => ride.dayPeriod.value == DayPeriod.morning,
          },
          ride.isNeedWheelchair,
          ride.isHasEscort,
          {
            column: ride.escortsCount,
            visible: (r) => ride.isHasEscort.value
          },
        ],
        ok: async () => {
          //PromiseThrottle
          // ride.driverId.value = undefined;
          await ride.save();
          if (isNeedReturnTrip.value && ride.dayPeriod.value == DayPeriod.morning) {
            var returnRide = this.context.for(Ride).create();
            ride.copyTo(returnRide);
            returnRide.from.value = ride.to.value;
            returnRide.to.value = ride.from.value;
            returnRide.dayOfWeek.value = ride.dayOfWeek.value;
            returnRide.dayPeriod.value = DayPeriod.afternoon;
            returnRide.save();
          }
        }
      },
    )
  }
}
