import { Component, OnInit } from '@angular/core';
import { BoolColumn, Context } from '@remult/core';
import { GridDialogComponent } from '../../common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { DayPeriod } from '../drivers/DriverPrefSchedule';
import { Ride } from '../rides/ride';
import { Patient } from './patient';

@Component({
  selector: 'app-patients',
  templateUrl: './patients.component.html',
  styleUrls: ['./patients.component.scss']
})
export class PatientsComponent implements OnInit {


  patientsSettings = this.context.for(Patient).gridSettings({
    allowCRUD: true,
    // columnSettings: ()=>[

    // ],
    rowButtons: [{
      name: "Add Ride",// "בקשות נסיעה",
      click: async (p) => await this.openRideDialog(p),
      icon: "drive_eta",
      visible: (d) => !d.isNew(),
    },
      // {
      //   name: "Schedule",// "יומן",
      //   click: async (d) => await this.openScheduleDialog(d),
      //   icon: "schedule",
      //   visible: (d) => d && d.id && d.id.value && d.id.value.length > 0,
      // }
    ],
  });

  constructor(private context: Context) { }

  ngOnInit() {
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
    var isNeedReturnTrip = new BoolColumn({caption:"Need Return Ride" });
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
          ride.isHasEscort,
          ride.isNeedWheelchair,
          {
            column: ride.escortsCount,
            visible: (r) => ride.isHasEscort.value
          },
        ],
        ok: async () => {
          //PromiseThrottle
          await ride.save();
          if(isNeedReturnTrip.value){
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

  async openRidesDialog(prefs: Patient) {


    // this.context.openDialog(GridDialogComponent, gd => gd.args = {
    //   title: "Schedule For " + this.context.for(Location).findId(prefs.locationId.value),
    //   settings: this.context.for(PatientPrefsSchedule).gridSettings({
    //     where: s => s.patientPrefsId.isEqualTo(prefs.id),
    //     newRow: s => s.patientPrefsId.value = prefs.id.value,
    //     allowCRUD: true,
    //     columnSettings: s => [
    //       s.dayOfWeek,
    //       s.dayPeriod,
    //       s.isEveryWeek,
    //     ]
    //   })
    // });

  }

}
