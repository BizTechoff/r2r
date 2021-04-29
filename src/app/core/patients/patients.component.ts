import { Component, OnInit } from '@angular/core';
import { BusyService, SelectValueDialogComponent } from '@remult/angular';
import { BoolColumn, Context, StringColumn, ValueListItem } from '@remult/core';
import { DialogService } from '../../common/dialog';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { DayPeriod, DriverPrefs } from '../drivers/driverPrefs';
import { Ride } from '../rides/ride';
import { Usher } from '../usher/usher';
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
    columnSettings: p => [p.name, p.mobile, /*p.idNumber,*/ p.defaultBorder, p.defaultHospital],
    where: p => this.search.value ? p.name.isContains(this.search) : undefined,
    rowButtons: [{
      textInMenu: "Add Ride",
      click: async (p) => await this.openRideDialog(p),
      icon: "directions_bus_filled",
      visible: (d) => !d.isNew(),
      showInLine: true,
    }, {
      textInMenu: "Schedule Rides",
      click: async (p) => await this.openScheduleRides(p),
      icon: "departure_board",
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
          [patient.defaultBorder, patient.defaultHospital],
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

  async openScheduleRides(p: Patient) {

    let values: ValueListItem[] = [];
    // console.log(r.date);
    let rides = await Usher.getRegisteredRidesForPatient(p.id.value);
    for (const r of rides) {
      values.push({
        id: r.id,
        caption: `${r.date} | ${r.from} | ${r.to} | ${r.status} | ${r.statusDate} | ${r.passengers} | ${r.phones}`,
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

  async openRideDialog(p: Patient) {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    var ride = this.context.for(Ride).create();
    ride.date.value = tomorrow;
    ride.dayOfWeek.value = DriverPrefs.getDayOfWeek(ride.date.getDayOfWeek());
    ride.dayPeriod.value = DayPeriod.morning;
    ride.patientId.value = p.id.value;
    ride.from.value = p.defaultBorder.value;
    ride.to.value = p.defaultHospital.value;
    var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Ride For: " + p.name.value,
        columnSettings: () => [
          ride.from,
          ride.to,
          ride.date, {
            column: ride.dayPeriod,
            valueList: [DayPeriod.morning, DayPeriod.afternoon]
          },
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
            await returnRide.save();
          }
        }
      },
    )
  }
}

