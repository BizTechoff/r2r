import { Component, OnInit } from '@angular/core';
import { Context, NumberColumn, ServerFunction, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { Roles } from '../../../users/roles';
import { Location } from '../../locations/location';
import { Patient } from '../../patients/patient';
import { Ride, RideStatus } from '../../rides/ride';
import { addDays } from '../../usher/ByDate';
import { Driver } from '../driver';
import { DriverPrefs } from '../driverPrefs';

@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.component.html',
  styleUrls: ['./driver-rides.component.scss']
})
export class DriverRidesComponent implements OnInit {

  driver: Driver;
  driverSuggestions: rides4Driver[];
  driverRegistered: rides4Driver[];

  constructor(private context: Context, private snakebar: DialogService) { }

  async ngOnInit() {
    this.driver = await this.context.for(Driver).findFirst(
      d => d.userId.isEqualTo(this.context.user.id),
    );

    await this.retrieve();
  }

  async retrieve() {

    this.driverRegistered = await DriverRidesComponent.retrieveRegisteredRides(
      this.driver.id.value);

    console.log(this.driverRegistered);

    if (this.driverRegistered.length == 0) {
      // this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }

    this.driverSuggestions = await DriverRidesComponent.retrieveSuggestedRides(
      this.driver.id.value);

    console.log(this.driverSuggestions);

    if (this.driverSuggestions.length == 0) {
      // this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }
  }

  @ServerFunction({ allowed: c => c.isSignedIn() })
  static async getServerDate() {
    return new Date();
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveRegisteredRides(driverId: string, context?: Context) {
    let result: rides4Driver[] = [];

    let today = await DriverRidesComponent.getServerDate();
    let tomorrow = addDays(1);
    let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
    let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

    for await (const ride of context.for(Ride).iterate({
      where: r => (r.date.isGreaterOrEqualTo(todayDate))
        .and(r.status.isDifferentFrom(RideStatus.waitingFor10DriverAccept))
        .and(r.driverId.isEqualTo(driverId)),
      orderBy: r => [{ column: r.date, descending: false }],
    })) {

      // Build Row
      let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

      let date = rDate.getTime() === todayDate.getTime()
        ? "Today"
        : rDate.getTime() === tomorrowDate.getTime()
          ? "Tomorrow"
          : rDate.toDateString;
      let period = ride.dayPeriod.value.id;
      let title = `${date} - ${period}`;

      let icons: string[] = [];
      if (ride.isNeedWheelchair.value) {
        icons.push("accessible");
      }
      if (ride.isHasExtraEquipment.value) {
        icons.push("home_repair_service");
      }

      let phones = "";
      let p = await context.for(Patient).findId(ride.patientId.value);
      if (p && p.mobile && p.mobile.value) {
        phones = p.mobile.value;
      }

      let row: rides4DriverRow = {
        id: ride.id.value,
        from: (await context.for(Location).findId(ride.from.value)).name.value,
        to: (await context.for(Location).findId(ride.to.value)).name.value,
        passengers: 1 + ride.escortsCount.value,//patient+escorts
        icons: icons,
        phones: phones,
        isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
        isWaitingForStart: ride.isWaitingForStart(),
        isWaitingForPickup: ride.isWaitingForPickup(),
        isWaitingForArrived: ride.isWaitingForArrived(),
      };

      let group = result.find(grp => grp.title === title);
      if (!(group)) {
        group = { title: title, rows: [] };
        result.push(group);
      }
      group.rows.push(row);
    }
    return result;
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveSuggestedRides(driverId: string, context?: Context) {
    let result: rides4Driver[] = [];

    let today = await DriverRidesComponent.getServerDate();
    let tomorrow = addDays(1);
    let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
    let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

    let locationsIds: string[] = [];
    for await (const pf of context.for(DriverPrefs).iterate({
      where: pf => pf.driverId.isEqualTo(driverId),
    })) {
      locationsIds.push(pf.locationId.value);
    };

    if (locationsIds.length > 0) {

      for await (const ride of context.for(Ride).iterate({
        where: r => (r.date.isGreaterOrEqualTo(todayDate))//dates
          .and(r.status.isEqualTo(RideStatus.waitingFor10DriverAccept))//status
          .and(r.from.isIn(...locationsIds).or(r.to.isIn(...locationsIds))),//locations
      })) {

        // Build Row
        let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

        let date = rDate.getTime() === todayDate.getTime()
          ? "Today"
          : rDate.getTime() === tomorrowDate.getTime()
            ? "Tomorrow"
            : rDate.toDateString;
        let period = ride.dayPeriod.value.id;
        let title = `${date} - ${period}`;

        let icons: string[] = [];
        if (ride.isNeedWheelchair.value) {
          icons.push("accessible");
        }
        if (ride.isHasExtraEquipment.value) {
          icons.push("home_repair_service");
        }

        let row: rides4DriverRow = {
          id: ride.id.value,
          from: (await context.for(Location).findId(ride.from.value)).name.value,
          to: (await context.for(Location).findId(ride.to.value)).name.value,
          passengers: 1 + ride.escortsCount.value,//patient+escorts
          icons: icons,
          phones: "",
          isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
          isWaitingForStart: ride.isWaitingForStart(),
          isWaitingForPickup: ride.isWaitingForPickup(),
          isWaitingForArrived: ride.isWaitingForArrived(),
        };

        let group = result.find(grp => grp.title === title);
        if (!(group)) {
          group = { title: title, rows: [] };
          result.push(group);
        }
        group.rows.push(row);
      }
    }
    return result;
  }


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
}

export interface rides4DriverRow {
  id: string,
  from: string,
  to: string,
  passengers: number,
  icons: string[],
  phones: string,

  isWaitingForUsherApproove: boolean,
  isWaitingForStart: boolean,
  isWaitingForPickup: boolean,
  isWaitingForArrived: boolean,

  // status: string, 
  // status: (id: string) => void,
};
export interface rides4Driver {
  title: string,
  rows: rides4DriverRow[],
};
