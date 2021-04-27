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

  async register(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
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

    if ((this.driverDataRows.todayMorning.length == 0) &&
      (this.driverDataRows.todayAfternoon.length == 0) &&
      (this.driverDataRows.tomorrowMorning.length == 0) &&
      (this.driverDataRows.tomorrowAfternoon.length == 0)) {
      this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }

    // console.log(this.driverDataRows);
  }

  @ServerFunction({ allowed: c => c.isSignedIn() })
  static async getServerDate() {
    return new Date();
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieve(driverId: string, context?: Context) {
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
  // from:string,
  // to:string,
  driverFromHour: string,
  driverToHour: string,
  driverPassengersCount: string,
  driverRemarks: string,
};