import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DateColumn, Filter, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { ride4UsherApprove, ride4UsherSetDriver } from '../../../shared/types';
import { Driver, DriverIdColumn } from '../../drivers/driver';
import { Location } from '../../locations/location';
import { Patient } from '../../patients/patient';
import { Ride, RideStatus } from '../../rides/ride';
import { SuggestDriverComponent } from '../suggest-driver/suggest-driver.component';


@ServerController({ key: 'usherSerDriver', allowed: true })
class usherSerDriver {
  date = new DateColumn();
  fid = new StringColumn();
  tid = new StringColumn();
  constructor(private context: Context) { }

  @ServerMethod()
  async retrieveRideList4UsherSetDriver(): Promise<ride4UsherSetDriver[]> {
    var result: ride4UsherSetDriver[] = [];
    var alwaysTrue = new Filter(x => { /* true */ });

    // drivers = dPrefs.push(d.prefId);//רק נהגים שמופיעים בנסיעות

    for await (const ride of this.context.for(Ride).iterate({
      where: r => r.date.isEqualTo(this.date)
        .and(this.fid.value ? r.fid.isEqualTo(this.fid) : alwaysTrue)
        .and(this.tid.value ? r.tid.isEqualTo(this.tid) : alwaysTrue)
        .and(r.status.isNotIn(...[RideStatus.succeeded])),
    })) {
      let from = (await this.context.for(Location).findId(ride.fid.value)).name.value;
      let to = (await this.context.for(Location).findId(ride.tid.value)).name.value;
      let d = (await this.context.for(Driver).findId(ride.driverId.value));
      let patient = ride.isHasPatient() ? (await this.context.for(Patient).findId(ride.patientId.value)).name.value : "";

      let seats = 0;
      if (d) {
        seats = d.seats.value;
      }
      let dName = '';
      if (d) {
        dName = d.name.value;
      }

      let row = result.find(r => r.id === ride.id.value);
      if (!(row)) {
        row = {
          id: ride.id.value,
          patientId: ride.patientId.value,
          driverId: ride.driverId.value,
          from: from,
          to: to,
          driver: dName,
          patient: patient,
          dMobile: "",
          passengers: ride.passengers(),
          selected: false,
          visitTime: ride.visitTime.value,
          rid: ride.id.value,
          status: ride.status.value,
          freeSeats: seats,
          w4Accept: ride.status.value === RideStatus.waitingForAccept,
          w4Arrived: ride.status.value === RideStatus.waitingForArrived,
          w4End: ride.status.value === RideStatus.waitingForEnd,
          w4Pickup: ride.status.value === RideStatus.waitingForPickup,
          w4Start: ride.status.value === RideStatus.waitingForStart,
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
    dataControlSettings: () => ({
      click: async () => {
        let selected = await this.context.openDialog(SuggestDriverComponent,
          sd => sd.args = { date: this.params.date.value, fid: this.params.fid.value, tid: this.params.tid.value },
          sd => sd.selected);
        if (selected.did.length > 0) {
          this.driverId.value = selected.did;
        }
      },
    }),
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
    let min: string = '23:59';
    //  console.log(min);
    let minChanged = false;
    this.selectedPassengers = 0;
    for (const row of this.rides) {
      // console.log(row.visitTime);
      // console.log(row.visitTime > min);
      // console.log(row.visitTime <= min);
      if (row.selected) {
        this.selectedPassengers += row.passengers;
        if (row.visitTime < min) {
          min = row.visitTime;
          minChanged = true;
        }
      }
    }
    if (minChanged) {
      let hour = min.split(':');
      if (hour.length > 1) {
        min = ('' + (parseInt(hour[0]) - 2)).padStart(2, "0") + ":" + hour[1];
      }
      this.selectedPickupTime = min;
    }
    // console.log(min);
    // console.log(this.selectedPickupTime);
  }
  selectionAllChanged() {

  }

  async accept4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has approved`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.waitingForStart;
      await ride.save();
      r.status = RideStatus.waitingForStart;
    }
  }

  async start4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has start`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.waitingForPickup;
      await ride.save();
      r.status = RideStatus.waitingForPickup;
    }
  }

  async pickup4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has pickup`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.waitingForArrived;
      await ride.save();
      r.status = RideStatus.waitingForArrived;
    }
  }

  async arrived4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has Arrived`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.waitingForEnd;
      await ride.save();
      r.status = RideStatus.waitingForEnd;
    }
  }

  async end4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has succeeded`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.succeeded;
      await ride.save();
      //r.status = RideStatus.succeeded.id;
      let i = this.rides.indexOf(r);
      if (i >= 0) {
        this.rides.splice(i, 1);
      }
    }
  }

  async removeDriver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.confirmDelete(r.driver + ' from selected ride');
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.driverId.value = '';
      ride.status.value = RideStatus.waitingForDriver;
      await ride.save();
      r.driver = '';
      r.driverId = '';
      r.status = RideStatus.waitingForDriver;
    }
  }
 
  async showRide(r: ride4UsherSetDriver) {

    let ride = await this.context.for(Ride).findId(r.id);
    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: `Edit Ride: (${r.status.id})`,
        columnSettings: () => [
          { column: ride.fid, readOnly: true },
          { column: ride.tid, readOnly: true },
          [
            { column: ride.date, readOnly: true },
            { column: ride.visitTime, readOnly: true }
          ],
          { column: ride.escortsCount, readOnly: true },
          [
            { column: ride.isHasBabyChair, readOnly: true, caption: "Baby Chair?" },
            { column: ride.isHasWheelchair, readOnly: true, caption: "Wheelchair?" }
          ],
          // { column: ride.dRemark, readOnly: true },
          { column: ride.rRemark, readOnly: true, caption: 'Remark' },
        ],
        ok: () => {  },//this.dialog.info("");
        cancel: () => { }
      },
    )
  }

  // [{ column: ride.isHasBabyChair, readOnly: true, clickIcon: 'child_friendly', caption: '?' },
  // { column: ride.isHasWheelchair, readOnly: true, clickIcon: 'accessible',caption: '?' }],

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