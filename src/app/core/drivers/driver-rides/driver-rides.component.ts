import { Component, OnInit } from '@angular/core';
import { BoolColumn, Context } from '@remult/core';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { Utils } from '../../../shared/utils';
import { Ride } from '../../rides/ride';
import { Usher } from '../../usher/usher';
import { Driver } from '../driver';
import { DayPeriod } from '../driverPrefSchedule';

@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.component.html',
  styleUrls: ['./driver-rides.component.scss']
})
export class DriverRidesComponent implements OnInit {

  releventRidesIds: string[];
  driver: Driver;

  constructor(private context: Context) { }

  async ngOnInit() {
    this.driver = await this.context.for(Driver).findFirst({
      where: d => d.userId.isEqualTo(this.context.user.id),
    });

    this.releventRidesIds = await Usher.getReleventRidesForDriver(
      this.context.user.id,
    );
    if (!(this.releventRidesIds == undefined && this.releventRidesIds.length == 0)) {
      this.releventRidesIds = [];
    }
    this.ridesSettings.reloadData();
  }

  ridesSettings = this.context.for(Ride).gridSettings({
    // rowButtons: [{
    //   textInMenu: "Find Driver",
    //   click: async (r) => await this.openDriversDialog(r),
    //   icon: "person_search",
    //   visible: (r) => !r.isNew(),
    //   showInLine: true,
    // }, {
    //   textInMenu: "Remove Driver",
    //   // click: async (p) => await this.openRideDialog(p),
    //   icon: "person_remove",
    //   visible: (d) => !d.isNew(),
    //   // showInLine: true,
    //   click: async (r) => {
    //     // console.log(r);
    //     let e: string;
    //     r.driverId.value = e;
    //     await r.save();
    //   },
    // },],
    numOfColumnsInGrid: 10,
    columnSettings: r => [
      r.from,
      r.to,
      r.date,
      r.dayOfWeek,
      r.dayPeriod,
    ],
    allowCRUD: true,
    // where: r =>
    //   r.id.isIn(...this.releventRidesIds),
    orderBy: r => [{ column: r.date, descending: true }],
    // saving: r => {r.dayOfWeek.value = Utils.getDayOfWeek(r.date.getDayOfWeek())},

  });

  async addRide() {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    var ride = this.context.for(Ride).create();
    ride.date.value = tomorrow;
    ride.dayOfWeek.value = Utils.getDayOfWeek(ride.date.getDayOfWeek());
    ride.dayPeriod.value = DayPeriod.morning;
    ride.driverId.value = this.driver.id.value;
    // ride.from.value = p.defaultBorderCrossing.value;
    // ride.to.value = p.defaultHospital.value;
    var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Ride For: " + this.driver.name.value,
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
