import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DateColumn, Filter, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { getRideList4UsherParams, ride4UsherSetDriver } from '../../../shared/types';
import { Driver, DriverIdColumn } from '../../drivers/driver';
import { Location } from '../../locations/location';
import { Patient } from '../../patients/patient';
import { Ride, RideStatus } from '../../rides/ride';
import { Usher } from '../usher';


@ServerController({ key: 'usherSerDriver', allowed: true })
class usherSerDriver {
  date = new DateColumn();
  fid = new StringColumn();
  tid = new StringColumn();
  constructor(private context: Context){}

  @ServerMethod()
  async retrieveRideList4UsherSetDriver(): Promise<ride4UsherSetDriver[]> {
    var result: ride4UsherSetDriver[] = [];

    for await (const ride of this.context.for(Ride).iterate({
      where: r => r.date.isEqualTo(this.date)
        .and(r.status.isNotIn(...[RideStatus.succeeded]))
        .and(this.fid.value ? r.fromLocation.isEqualTo(this.fid) : new Filter(x => { /* true */ }))
        .and(this.tid.value ? r.toLocation.isEqualTo(this.tid) : new Filter(x => { /* true */ })),
    })) {
      let from = (await this.context.for(Location).findId(ride.fromLocation.value)).name.value;
      let to = (await this.context.for(Location).findId(ride.toLocation.value)).name.value;
      let driver = ride.isHasDriver() ? (await this.context.for(Driver).findId(ride.driverId.value)).name.value : "";
      let patient = ride.isHasPatient() ? (await this.context.for(Patient).findId(ride.patientId.value)).name.value : "";

      let row = result.find(r => r.id === ride.id.value);
      if (!(row)) {
        row = {
          id: ride.id.value,
          patientId: ride.patientId.value,
          driverId: ride.driverId.value,
          from: from,
          to: to,
          driver: driver,
          patient: patient,
          dMobile: "",
          passengers: ride.passengers(),
          selected: false,
          visitTime: ride.visitTime.value,
        };
        result.push(row);
      }
    }

    console.log(result)
    result.sort((r1, r2) => r1.from.localeCompare(r2.from));

    return result;
  }
}

export interface rideRow {
  id: string,
  selected: boolean,
  from: string,
  to: string,
  driver?: string,
  dMobile?: string,
  visitTime: string,
  passengers: number,
  patient: string,
};

@Component({
  selector: 'app-set-driver',
  templateUrl: './set-driver.component.html',
  styleUrls: ['./set-driver.component.scss']
})
export class SetDriverComponent implements OnInit {
  
  params = new usherSerDriver(this.context);

  clearSelections() {
    for (const row of this.rides) {
      row.selected = false;
    }
    this.selectedPassengers = 0;
  }

  driverSeats: number = 0;
  //selectedVisitTime = "12:00";
  selectedPickupTime = "00:00";
  driverId = new DriverIdColumn({
    caption: "Select Driver To Set",
    valueChange: async () => {
      this.driverSeats = (await this.context.for(Driver).findId(this.driverId.value)).seats.value;
      if (this.selectedPassengers > this.driverSeats) {
        this.clearSelections();
      }
    }
  }, this.context);
  driverArea = new DataAreaSettings({
    columnSettings: () => [
      {
        column: this.driverId,
      },],
  });
  protected selectedPassengers: number = 0;
  protected fromName: string;
  protected toName: string;
  protected rides: ride4UsherSetDriver[];
  args: {
    date: Date,
    from: string,
    to: string,
  };
  constructor(protected context: Context, private dialog: DialogService) { }

  async ngOnInit() {
    this.params.date.value = this.args.date;
    this.params.fid.value = this.args.from;
    this.params.tid.value = this.args.to;

    this.fromName = (await this.context.for(Location).findId(this.args.from)).name.value;
    this.toName = (await this.context.for(Location).findId(this.args.to)).name.value;
    console.log(this.args);
    await this.retrieve();
  }

  async retrieve() {

    this.rides = await this.params.retrieveRideList4UsherSetDriver();
  }

  async setDriver() {
    let setStatusToApproved = await this.dialog.yesNoQuestion("Set status To approved-by-driver");
    for (const r of this.rides) {
      if (r.selected) {
        let ride = await this.context.for(Ride).findId(r.id);
        ride.pickupTime.value = this.selectedPickupTime;
        ride.driverId.value = this.driverId.value;
        ride.status.value = RideStatus.waitingForAccept;
        if (setStatusToApproved) {
          ride.status.value = RideStatus.waitingForStart;
        }
        await ride.save();
        let d = await this.context.for(Driver).findId(this.driverId.value);
        r.driver = d.name.value;
        r.driverId = this.driverId.value;
      }
    }
    this.clearSelections();
  }

  selectionRowChanged(r: rideRow) {
    let min:string = '23:59';
    //  console.log(min);
    let minChanged = false;
    this.selectedPassengers = 0;
    for (const row of this.rides) {
      // console.log(row.visitTime);
      // console.log(row.visitTime > min);
      // console.log(row.visitTime <= min);
      if (row.selected) {
        this.selectedPassengers += row.passengers;
        if (row.visitTime  < min) {
          min = row.visitTime;
          minChanged = true;
        }
      }
    }
    if (minChanged) {
      let hour = min.split(':');
      if(hour.length > 1)
      {
        min = ('' + (parseInt( hour[0]) - 2)).padStart(2, "0") + ":" + hour[1];
      }
      this.selectedPickupTime = min;
    }
    // console.log(min);
    // console.log(this.selectedPickupTime);
  }
  selectionAllChanged() {

  }

}


/*


    this.rides = await SelectedRidesComponent.retrieve(
      this.fromName, this.toName, this.args.date, this.args.from, this.args.to
    );
  }

  @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
  static async retrieve(fromName: string, toName: string, date: Date, from: string, to: string, context?: Context) {
    let rows = [];
    if (date && from && to) {
      for await (const r of await context.for(Ride).find({
        where: (r) => r.date.isEqualTo(date)
          .and(r.status.isNotIn(...[RideStatus.succeeded]))
          .and(r.fromLocation.isEqualTo(from))
          .and(r.toLocation.isEqualTo(to))
        // .and(to && (to.trim().length > 0) ? r.toLocation.isEqualTo(to) : new Filter(x => { })),
      })) {
        let driverName = '';
        if (r.isHasDriver()) {
          driverName = (await context.for(Driver).findId(r.driverId.value)).name.value;
        }
        let visitTime = '';
        if (r.isHasVisitTime()) {
          visitTime = formatDate(r.visitTime.value, 'HH:mm', 'en-US');
        }
        rows.push({
          id: r.id.value,
          selected: false,
          from: fromName,
          to: toName,
          driver: driverName,
          visitTime: visitTime,
          passengers: r.passengers(),
        });
      }
    }
    return rows;
  }
*/