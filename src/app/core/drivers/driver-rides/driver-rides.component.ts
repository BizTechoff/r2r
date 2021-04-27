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

  driverSuggestions: driverRideRows;
  driverRegistered: driverRideRows;

  constructor(private context: Context, private snakebar: DialogService) { }

  async register(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Register To Ride",
        columnSettings: () => [
          {
            caption: "I'm Available From Hour",
            column: new StringColumn({ defaultValue: this.driver.defaultFromTime.value }),
          },
          {
            caption: "I'm Available till Hour",
            column: new StringColumn({ defaultValue: this.driver.defaultToTime.value }),
          },
          {
            caption: "Paasengers I can take",
            column: new NumberColumn({
              defaultValue: Math.min(ride.escortsCount.value + 1, this.driver.seats.value > 0 ? this.driver.seats.value : Number.MAX_VALUE),
              validate: () => { }
            }),//max,min
          },
          {
            caption: "Remarks",
            column: new StringColumn({}),
          },
        ],
        ok: async () => {
          ride.driverId.value = this.driver.id.value;
          ride.status.value = RideStatus.waitingFor20UsherApproove;
          await ride.save();
          this.snakebar.info("Thank You! We will contact you ASAP")
          await this.retrieve();
        }
      },
    )
  }

  async startDriving(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingFor40Pickup;
    await ride.save();
    await this.retrieve();
  }

  async pickup(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingFor50Arrived;
    await ride.save();
    await this.retrieve();
  }

  async arrived(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.succeeded;
    await ride.save();
    await this.retrieve();
  }

  async unRegister(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "UnRegister From Ride",
        columnSettings: () => [
          {
            caption: "Please Tell Us Why?",
            column: new StringColumn({}),
          },
        ],
        ok: async () => {
          ride.driverId.value = '';
          ride.status.value = RideStatus.waitingFor10DriverAccept;
          await ride.save();
          this.snakebar.info("Thank You! Waiting To See You Again")
          await this.retrieve();
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

    await this.retrieve();
  }

  async retrieve() {

    this.driverSuggestions = await DriverRidesComponent.retrieveSuggestedRides(
      this.driver.id.value);

    if ((this.driverSuggestions.todayMorning.length == 0) &&
      (this.driverSuggestions.todayAfternoon.length == 0) &&
      (this.driverSuggestions.tomorrowMorning.length == 0) &&
      (this.driverSuggestions.tomorrowAfternoon.length == 0)) {
      this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }

    this.driverRegistered = await DriverRidesComponent.retrieveRegisteredRides(
      this.driver.id.value);

    if ((this.driverRegistered.todayMorning.length == 0) &&
      (this.driverRegistered.todayAfternoon.length == 0) &&
      (this.driverRegistered.tomorrowMorning.length == 0) &&
      (this.driverRegistered.tomorrowAfternoon.length == 0)) {
      // this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }

    // console.log(this.driverDataRows);
  }

  // isWaitingForUsherApproove(r: Ride) {
  //   return r.isWaitingForUsherApproove();
  // }
 
  @ServerFunction({ allowed: c => c.isSignedIn() })
  static async getServerDate() {
    return new Date();
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveRegisteredRides(driverId: string, context?: Context) {
    let result: driverRideRows = {
      todayMorning: [] = [],
      todayAfternoon: [] = [],
      tomorrowMorning: [] = [],
      tomorrowAfternoon: [] = [],
    };

    let today = await DriverRidesComponent.getServerDate();
    let tomorrow = addDays(1);
    // Should be server-function ?
    for await (const ride of context.for(Ride).iterate({
      where: r => (r.date.isIn(today, tomorrow))//.isEqualTo(today).or(r.date.isEqualTo(tomorrow)))
        .and(r.status.isDifferentFrom(RideStatus.waitingFor10DriverAccept))
        .and(r.driverId.isEqualTo(driverId))
    })) {
      let title = (await context.for(Location).findId(ride.from.value)).name.value
        + " -> " + (await context.for(Location).findId(ride.to.value)).name.value;

      let subTitle = "Found " + (ride.escortsCount.value + 1) + " Passengers";// + " + ride.date.getDayOfWeek();
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
        status: ride.status.value.caption,
        icons: icons,
        driverFromHour: "00:00",
        driverToHour: "00:00",
        driverPassengersCount: "" + (ride.escortsCount.value + 1),
        driverRemarks: '',
        isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
        isWaitingForStart: ride.isWaitingForStart(),
        isWaitingForPickup: ride.isWaitingForPickup(),
        isWaitingForArrived: ride.isWaitingForArrived(),
      };
      if (ride.date.value.getDate() == (today.getDate())) {
        // console.log(ride.date.value + " " + today.toString());
        if (ride.dayPeriod.isEqualTo(DayPeriod.morning)) {
          result.todayMorning.push(rr);
        }
        else if (ride.dayPeriod.isEqualTo(DayPeriod.afternoon)) {
          result.todayAfternoon.push(rr);
        }
      }
      else if (ride.date.value.getDate() == (tomorrow.getDate())) {
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


  @ServerFunction({ allowed: Roles.driver })
  static async retrieveSuggestedRides(driverId: string, context?: Context) {
    let result: driverRideRows = {
      todayMorning: [] = [],
      todayAfternoon: [] = [],
      tomorrowMorning: [] = [],
      tomorrowAfternoon: [] = [],
    };

    let today = await DriverRidesComponent.getServerDate();
    // console.log(today.getDay());
    let tomorrow = addDays(1);
    // console.log(tomorrow.getDay());
    // let distinct:string[] = [];
    // let groupBy:groupByRideRow[] = [];
    let locationsIds: string[] = [];
    for await (const pf of context.for(DriverPrefs).iterate({
      where: pf => pf.driverId.isEqualTo(driverId),
    })) {
      locationsIds.push(pf.locationId.value);
      // console.log(pf.locationId.value);
    };

    if (locationsIds.length > 0) {

      // Should be server-function ?
      for await (const ride of context.for(Ride).iterate({
        where: r => (r.date.isIn(today, tomorrow))//.isEqualTo(today).or(r.date.isEqualTo(tomorrow)))
          .and(r.status.isEqualTo(RideStatus.waitingFor10DriverAccept))
          .and(r.from.isIn(...locationsIds)),
      })) {
        //       console.log("ride.from.value");
        // console.log(ride.from.value);
        let title = (await context.for(Location).findId(ride.from.value)).name.value
          + " -> " + (await context.for(Location).findId(ride.to.value)).name.value;

        // if(!(distinct.includes(title))){
        //   distinct.push(title);
        //   groupBy.push(new groupByRideRow());
        // }

        // groupBy[""].

        let subTitle = "Found " + (ride.escortsCount.value + 1) + " Passengers";// + " + ride.date.getDayOfWeek();
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
          isWaitingForDriverAccept: ride.isWaitingForDriverAccept(),
        };
        if (ride.date.value.getDate() == (today.getDate())) {
          // console.log(ride.date.value + " " + today.toString());
          if (ride.dayPeriod.isEqualTo(DayPeriod.morning)) {
            result.todayMorning.push(rr);
          }
          else if (ride.dayPeriod.isEqualTo(DayPeriod.afternoon)) {
            result.todayAfternoon.push(rr);
          }
        }
        else if (ride.date.value.getDate() == (tomorrow.getDate())) {
          if (ride.dayPeriod.isEqualTo(DayPeriod.morning)) {
            result.tomorrowMorning.push(rr);
          }
          else if (ride.dayPeriod.isEqualTo(DayPeriod.afternoon)) {
            result.tomorrowAfternoon.push(rr);
          }
        }
      };

    }
    return result;
  }
}

export interface driverRideRows {
  todayMorning: rideRow[],
  todayAfternoon: rideRow[],
  tomorrowMorning: rideRow[],
  tomorrowAfternoon: rideRow[],
};

export interface groupByRideRow {
  title: string,
  rows: rideRow[],
}

export interface rideRow {
  id: string,
  title: string,
  subTitle: string,
  icons: string[],
  status?: string,
  driverFromHour: string,
  driverToHour: string,
  driverPassengersCount: string,
  driverRemarks: string,
  isWaitingForDriverAccept? :boolean,
  isWaitingForUsherApproove? :boolean,
  isWaitingForStart? :boolean,
  isWaitingForPickup? :boolean,
  isWaitingForArrived?:boolean,
};