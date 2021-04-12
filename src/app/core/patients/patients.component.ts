import { Component, OnInit } from '@angular/core';
import { BoolColumn, Context } from '@remult/core';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { DayPeriod } from '../drivers/driverPrefSchedule';
import { Ride } from '../rides/ride';
import { ByDate, ByDateColumn, Usher } from '../usher/usher';
import { Patient } from './patient';

@Component({
  selector: 'app-patients',
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.scss']
})
export class PatientsComponent implements OnInit {

  
  byDate = new ByDateColumn();

  patientsSettings = this.context.for(Patient).gridSettings({
    allowCRUD: true,
    rowButtons: [{
      name: "Add Ride",
      click: async (p) => await this.openRideDialog(p),
      icon: "drive_eta",
      visible: (d) => !d.isNew(),
      showInLine: true,
    },],
  });

  constructor(private context: Context) {
   }

  ngOnInit() {
    // this.byDate.value = ByDate.today;
  }

  async assign(){
    await (new Usher()).organize(
      this.byDate.value,
      this.context,
    );
  }

  async openRideDialog(p: Patient) {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    var ride = this.context.for(Ride).create();
    ride.date.value = tomorrow;
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
          await ride.save();
          if (isNeedReturnTrip.value) {
            var returnRide = this.context.for(Ride).create();
            ride.copyTo(returnRide);
            returnRide.from.value = ride.to.value;
            returnRide.to.value = ride.from.value;
            returnRide.dayPeriod.value = DayPeriod.afternoon;
            returnRide.save();
          }
        }
      },
    )
  }
}
