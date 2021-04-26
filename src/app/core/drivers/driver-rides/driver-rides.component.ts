import { Component, OnInit } from '@angular/core';
import { BoolColumn, Context, NumberColumn, ServerFunction, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { Utils } from '../../../shared/utils';
import { Ride, RideStatus } from '../../rides/ride';
import { addDays, ByDate, ByDateColumn } from '../../usher/ByDate';
import { Usher } from '../../usher/usher';
import { Driver } from '../driver';
import { DayPeriod } from '../driverPrefSchedule';
import { Location } from '../../locations/location';
import { Roles } from '../../../users/roles';
import { DriverPrefs } from '../driverPrefs';

@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.component.html',
  styleUrls: ['./driver-rides.component.scss']
})
export class DriverRidesComponent implements OnInit {


  releventRidesIds: string[];
  driver: Driver;
  today: Date;
  tomorrow: Date;

  driverDataRows: driverRideRows;

  constructor(private context: Context, private snakebar: DialogService) { }

async register(rideId:string){
  let ride =await this.context.for(Ride).findId(rideId);
  this.context.openDialog(
    InputAreaComponent,
    x => x.args = {
      title: "Register To Ride",
      columnSettings: () => [
        {
          caption: "I'm Available From Hour",
          column: new StringColumn({}),
        },
        {
          caption: "I'm Available till Hour",
          column: new StringColumn({}),
        },
        {
          caption: "Paasengers I can take",
          column: new NumberColumn({defaultValue: Math.min(ride.escortsCount.value + 1, this.driver.seats.value > 0?this.driver.seats.value:Number.MAX_VALUE)}),
        },
      ],
      ok: async () => {
        this.snakebar.info("Thank You! We will contact you ASAP")
        //PromiseThrottle
        // ride.driverId.value = undefined;
        // await ride.save();
      }
    },
  )
}

  async ngOnInit() {
    this.today = await DriverRidesComponent.getServerDate();
    this.tomorrow = addDays(1);
    this.driver = await this.context.for(Driver).findFirst(
      d => d.userId.isEqualTo(this.context.user.id),
    );
    this.driverDataRows = await DriverRidesComponent.retrieve(
      this.driver.id.value);
    }

  @ServerFunction({ allowed: c => c.isSignedIn() })
  static async getServerDate() {
    return new Date();
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieve(driverId: string, context?: Context) {
    let result:driverRideRows= {
      todayMorning: [] = [],
      todayAfternoon: [] = [],
      tomorrowMorning: [] = [],
      tomorrowAfternoon: [] = [],
    };

    let today = await DriverRidesComponent.getServerDate();
    let tomorrow = addDays(1);

    let locationsIds: string[] = [];
    for await (const pf of context.for(DriverPrefs).iterate({
      where: pf => pf.driverId.isEqualTo(driverId),
    })) {
      locationsIds.push(pf.locationId.value);
    };

    // Should be server-function ?
    for await (const ride of context.for(Ride).iterate({
      where: r => r.date.isEqualTo(today) || r.date.isEqualTo(tomorrow)
        .and(r.status.isEqualTo(RideStatus.waitingFor10DriverAccept))
        .and(r.from.isIn(...locationsIds)),
    })) {

      let title = (await context.for(Location).findId(ride.from.value)).name.value
        + " -> " + (await context.for(Location).findId(ride.to.value)).name.value;
      let subTitle = "" + (ride.escortsCount.value + 1);
      let icons: string[] = [];
      if (ride.isNeedWheelchair.value) {
        icons.push("accessible");
      }
      if (ride.isHasExtraEquipment.value) {
        icons.push("home_repair_service");
      }

      let rr: rideRow = {
        id: ride.id.value,
        title: title,
        subTitle: subTitle,
        icons: icons,
        driverFromHour: "00:00",
        driverToHour: "00:00",
        driverPassengersCount: "" + (ride.escortsCount.value + 1),
        driverRemarks: '',
      };
      if (ride.date.isEqualTo(today)) {
        if (ride.dayPeriod.isEqualTo(DayPeriod.morning)) {
          result.todayMorning.push(rr);
        }
        else if (ride.dayPeriod.isEqualTo(DayPeriod.afternoon)) {
          result.todayAfternoon.push(rr);
        }
      }
      else if (ride.date.isEqualTo(tomorrow)) {
        if (ride.dayPeriod.isEqualTo(DayPeriod.morning)) {
          result.tomorrowMorning.push(rr);
        }
        else if (ride.dayPeriod.isEqualTo(DayPeriod.afternoon)) {
          result.tomorrowAfternoon.push(rr);
        }
      }
    };
    return result;
  }

  // getDayOfWeek() {
  //   // Usher.
  // }

  // todayMorningRidesSettings = this.context.for(Ride).gridSettings({
  //   numOfColumnsInGrid: 10,
  //   columnSettings: r => [
  //     r.from,
  //     r.to,
  //     {
  //       caption: "Passengers",
  //       column: r.escortsCount,
  //       displayValue: (1 /*patient*/ + r.escortsCount.value),
  //     },
  //     {
  //       // displayValue: undefined,
  //       column: r.isNeedWheelchair,
  //       clickIcon: "accessible",
  //       click: () => { },
  //     },
  //     {
  //       // displayValue: undefined,
  //       column: r.isHasExtraEquipment,
  //       clickIcon: "home_repair_service",
  //       click: () => { },
  //     },
  //   ],
  //   rowButtons: [{
  //     textInMenu: "Assign Me To Ride",
  //     click: async (r) => await this.openAssignToRideDialog(r),
  //     icon: "person_add_alt",
  //     visible: (r) => !r.isNew(),
  //     showInLine: true,
  //   },],
  //   // allowCRUD: true,
  //   knowTotalRows: true,
  //   // allowDelete: false,
  //   // allowInsert: false,
  //   // allowUpdate: false,
  //   // where: r => r.dayPeriod.isEqualTo(DayPeriod.morning).and(
  //   //   // r    ).and(
  //   //   this.byDate.value.filter(r.date)),
  //   where: r => this.byDate.value.filter(r.date).and(
  //     r.dayPeriod.isEqualTo(DayPeriod.morning)
  //   ),
  //   // where: r =>
  //   //   r.id.isIn(...this.releventRidesIds),
  //   orderBy: r => [{ column: r.date, descending: true }],
  //   // saving: r => {r.dayOfWeek.value = Utils.getDayOfWeek(r.date.getDayOfWeek())},

  // });


  // async openAssignToRideDialog(r: Ride) {
  //   console.log(r.driverId.value);
  //   console.log(this.driver.id.value);
  //   r.driverId.value = this.driver.id.value;
  //   r.assignDate.value = new Date();
  //   await r.save();
  //   this.snakebar.info("Thank you! we'll contact u soon");
  // }

  // byDate = new ByDateColumn({
  //   valueChange: () => {
  //     this.todayMorningRidesSettings.reloadData();
  //     this.todayAfternoonRidesSettings.reloadData();
  //   },
  //   defaultValue: ByDate.all
  // });//(ByDate.today);

  // todayAfternoonRidesSettings = this.context.for(Ride).gridSettings({
  //   knowTotalRows: true,
  //   // rowButtons: [{
  //   //   textInMenu: "Find Driver",
  //   //   click: async (r) => await this.openDriversDialog(r),
  //   //   icon: "person_search",
  //   //   visible: (r) => !r.isNew(),
  //   //   showInLine: true,
  //   // }, {
  //   //   textInMenu: "Remove Driver",
  //   //   // click: async (p) => await this.openRideDialog(p),
  //   //   icon: "person_remove",
  //   //   visible: (d) => !d.isNew(),
  //   //   // showInLine: true,
  //   //   click: async (r) => {
  //   //     // console.log(r);
  //   //     let e: string;
  //   //     r.driverId.value = e;
  //   //     await r.save();
  //   //   },
  //   // },],
  //   numOfColumnsInGrid: 10,
  //   columnSettings: r => [
  //     r.from,
  //     r.to,
  //     r.date,
  //     r.dayOfWeek,
  //     r.dayPeriod,
  //   ],
  //   allowCRUD: true,
  //   where: r =>
  //     r.dayPeriod.isEqualTo(DayPeriod.afternoon).and(
  //       this.byDate.value.filter(r.date)),
  //   // where: r =>
  //   //   r.id.isIn(...this.releventRidesIds),
  //   orderBy: r => [{ column: r.date, descending: true }],
  //   // saving: r => {r.dayOfWeek.value = Utils.getDayOfWeek(r.date.getDayOfWeek())},

  // });

  // async addRide() {
  //   let today = new Date();
  //   let tomorrow = new Date();
  //   tomorrow.setDate(today.getDate() + 1);

  //   var ride = this.context.for(Ride).create();
  //   ride.date.value = tomorrow;
  //   ride.dayOfWeek.value = Utils.getDayOfWeek(ride.date.getDayOfWeek());
  //   ride.dayPeriod.value = DayPeriod.morning;
  //   ride.driverId.value = this.driver.id.value;
  //   // ride.from.value = p.defaultBorderCrossing.value;
  //   // ride.to.value = p.defaultHospital.value;
  //   var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
  //   this.context.openDialog(
  //     InputAreaComponent,
  //     x => x.args = {
  //       title: "Ride For: " + this.driver.name.value,
  //       columnSettings: () => [
  //         ride.from,
  //         ride.to,
  //         ride.date,
  //         ride.dayPeriod,
  //         {
  //           column: isNeedReturnTrip,
  //           visible: (r) => ride.dayPeriod.value == DayPeriod.morning,
  //         },
  //         ride.isNeedWheelchair,
  //         ride.isHasEscort,
  //         {
  //           column: ride.escortsCount,
  //           visible: (r) => ride.isHasEscort.value
  //         },
  //       ],
  //       ok: async () => {
  //         //PromiseThrottle
  //         // ride.driverId.value = undefined;
  //         await ride.save();
  //         if (isNeedReturnTrip.value && ride.dayPeriod.value == DayPeriod.morning) {
  //           var returnRide = this.context.for(Ride).create();
  //           ride.copyTo(returnRide);
  //           returnRide.from.value = ride.to.value;
  //           returnRide.to.value = ride.from.value;
  //           returnRide.dayOfWeek.value = ride.dayOfWeek.value;
  //           returnRide.dayPeriod.value = DayPeriod.afternoon;
  //           returnRide.save();
  //         }
  //       }
  //     },
  //   )
  // }

}

export interface driverRideRows {
  todayMorning: rideRow[],
  todayAfternoon: rideRow[],
  tomorrowMorning: rideRow[],
  tomorrowAfternoon: rideRow[],
};

export interface rideRow {
  id: string,
  title: string,
  subTitle: string,
  icons: string[],
  // from:string,
  // to:string,
  driverFromHour: string,
  driverToHour: string,
  driverPassengersCount: string,
  driverRemarks: string,
};