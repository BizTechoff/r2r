import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BoolColumn, Context, DataAreaSettings, DateColumn, Entity, Filter, GridSettings, NumberColumn, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { PickupTimePrevHours, ride4UsherSetDriver, TimeColumn } from '../../../shared/types';
import { addHours } from '../../../shared/utils';
import { Driver, DriverIdColumn } from '../../drivers/driver';
import { RegisterDriver } from '../../drivers/registerDriver';
import { Location } from '../../locations/location';
import { Patient, PatientIdColumn } from '../../patients/patient';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';
import { RideCrudComponent } from '../../rides/ride-crud/ride-crud.component';
import { SuggestDriverComponent } from '../suggest-driver/suggest-driver.component';


@ServerController({ key: 'u/set', allowed: true })
class usherSerDriver {
  date = new DateColumn();
  fid = new StringColumn();
  tid = new StringColumn();
  constructor(private context: Context) { }

  @ServerMethod()
  async retrieve(): Promise<{ rides: ride4UsherSetDriver[], counter: { rides: number, pass: number } }> {
    var result: { rides: ride4UsherSetDriver[], counter: { rides: number, pass: number } } = { rides: [], counter: { rides: 0, pass: 0 } };

    var alwaysTrue = new Filter(x => { /* true */ });

    // drivers = dPrefs.push(d.prefId);//רק נהגים שמופיעים בנסיעות

    for await (const ride of this.context.for(Ride).iterate({
      where: cur => cur.date.isEqualTo(this.date)
        .and(this.fid.value ? cur.fid.isEqualTo(this.fid) : alwaysTrue)
        .and(this.tid.value ? cur.tid.isEqualTo(this.tid) : alwaysTrue)
        .and(cur.status.isNotIn(...[RideStatus.Succeeded])),
      orderBy: cur => [{ column: cur.visitTime, descending: false }]
    })) {
      let from = (await this.context.for(Location).findId(ride.fid.value)).name.value;
      let to = (await this.context.for(Location).findId(ride.tid.value)).name.value;
      let patient = ride.isHasPatient() ? (await this.context.for(Patient).findId(ride.pid.value)).name.value : "";
      let d = (await this.context.for(Driver).findId(ride.did.value));

      let dName = '';
      let seats = 0;
      let feedback = '';// ride.dFeedback.value;
      if (RideStatus.isDriverFeedback.includes(ride.status.value)) {
        feedback = ride.dFeedback.value;
      }
      if (d) {
        seats = d.seats.value;
        dName = d.name.value;
      }

      let row = result.rides.find(r => r.id === ride.id.value);
      if (!(row)) {
        row = {
          id: ride.id.value,
          patientId: ride.pid.value,
          driverId: ride.did.value,
          from: from,
          to: to,
          driver: dName,
          patient: patient,
          dMobile: "",
          passengers: ride.passengers(),
          selected: false,
          visitTime: ride.visitTime.value,
          pickupTime: ride.pickupTime.value,
          rid: ride.id.value,
          status: ride.status.value,
          freeSeats: seats,
          w4Accept: ride.status.value === RideStatus.w4_Accept,
          w4Arrived: ride.status.value === RideStatus.w4_Arrived,
          notActiveYet: false,
          w4Pickup: ride.status.value === RideStatus.w4_Pickup,
          w4Start: ride.status.value === RideStatus.w4_Start,
          dFeedback: feedback
        };
        result.rides.push(row);
        result.counter.rides += 1;
        result.counter.pass += ride.passengers();
      }
    }

    // sort-by: [visitTime, passengers, driver]
    result.rides.sort((r1, r2) => r1.visitTime.localeCompare(r2.visitTime) === 0
      ? r1.passengers - r2.passengers === 0
        ? r1.driver.localeCompare(r2.driver)
        : r1.passengers - r2.passengers
      : r1.visitTime.localeCompare(r2.visitTime));

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

  close() {
    this.dialogRef.close();
  }

  driverSeats: number = 0;
  //selectedVisitTime = "12:00";
  selectedPickupTime = "00:00";
  did = new DriverIdColumn({
    caption: "Select Driver To Set",
    dataControlSettings: () => ({
      click: async () => {
        let selected = await this.context.openDialog(SuggestDriverComponent,
          sd => sd.args = { date: this.params.date.value, fid: this.params.fid.value, tid: this.params.tid.value },
          sd => sd.selected);
        if (selected && selected.did && selected.did.length > 0) {//if press back on browser will window was open.
          this.did.value = selected.did;
        }
      },
    }),
    valueChange: async () => {
      this.driverSeats = (await this.context.for(Driver).findId(this.did.value)).seats.value;
      if (this.selectedPassengers > this.driverSeats) {
        this.clearSelections();
      }
    }
  }, this.context);
  protected selectedPassengers: number = 0;
  protected fromName: string;
  protected toName: string;
  protected rides: ride4UsherSetDriver[];
  protected counter: { rides: number, pass: number };
  args: {
    date: Date,
    from: string,
    to: string,
    changed?: boolean
  };
  constructor(protected context: Context, private dialog: DialogService, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    this.params.date.value = this.args.date;
    this.params.fid.value = this.args.from;
    this.params.tid.value = this.args.to;

    this.fromName = (await this.context.for(Location).findId(this.args.from)).name.value;
    this.toName = (await this.context.for(Location).findId(this.args.to)).name.value;
    console.log(this.args);
    await this.retrieve();
  }

  grid: GridSettings;
  async retrieve() {

    let res = await this.params.retrieve();
    this.rides = res.rides;
    this.counter = res.counter;
    // var mem = new InMemoryDataProvider();
    // mem.rows["ride4UsherSetDriverEntity"] = this.rides;
    // this.grid =this.context.for(ride4UsherSetDriverEntity,mem).gridSettings({
    //   orderBy: cur => cur.visitTime,
    //   numOfColumnsInGrid: 10,
    //   columnSettings: cur => [
    //     cur.driverId,
    //     cur.visitTime,
    //     cur.passengers,
    //   ],
    //   rowButtons: [
    //     {textInMenu: '',
    //     visible: cur => cur.w4Accept.value,
    //     click: async cur => await this.accept4Driver(cur);
    //   }
    //   ],
    // });

  }

  async setDriver() {
    let count = 0;
    for (const r of this.rides) {
      if (r.notActiveYet) {
        ++count;
      }
    }
    let setStatusToApproved = false;
    if (count !== this.rides.length) {
      setStatusToApproved = await this.dialog.yesNoQuestion("Set status To approved-by-driver");
    }
    for (const r of this.rides) {
      if (r.selected) {
        let ride = await this.context.for(Ride).findId(r.id);
        ride.pickupTime.value = this.selectedPickupTime;
        ride.did.value = this.did.value;
        if (!r.notActiveYet) {
          ride.status.value = RideStatus.w4_Accept;
          if (setStatusToApproved) {
            ride.status.value = RideStatus.w4_Start;
          }
        }
        await ride.save();
        this.args.changed = true;
        // update register-drivers that ride was taken.
        if (false) {
          for await (const rd of this.context.for(RegisterDriver).iterate({
            where: cur => cur.did.isEqualTo(this.did)
          })) {
            if (rd.hasRideId()) {
              if (rd.rid.value === ride.id.value) {
                rd.done.value = true;
                await rd.save();
              }
            }
            else if (rd.hasRideRegisterId()) {
              // let rr = await this.context.for(RegisterRide).findFirst(
              //   cur => cur.did.isEqualTo(this.did)
              //     .and(cur.rid.isEqualTo(ride.id)));
            }
          }
        }

        let d = await this.context.for(Driver).findId(this.did.value);
        r.driver = d.name.value;
        r.driverId = this.did.value;
        r.pickupTime = ride.pickupTime.value;
        r.status = ride.status.value;
        r.w4Accept = ride.isWaitingForAccept();
        r.w4Start = ride.isWaitingForStart();
        r.w4Pickup = ride.isWaitingForPickup();
        r.w4Arrived = ride.isWaitingForArrived();
        r.notActiveYet = ride.isNotActiveYet();
        // r.w4Start = ride.isWaitingForStart();
      }
    }
    this.clearSelections();
    if (this.args.changed) {
      this.close();
    }
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
        let pick = TimeColumn.Empty;
        this.selectedPassengers += row.passengers;
        if (row.pickupTime && row.pickupTime.length > 0 && row.pickupTime !== TimeColumn.Empty) {
          pick = row.pickupTime;
        }
        else {
          if (row.visitTime && row.visitTime.length > 0 && row.visitTime !== TimeColumn.Empty) {
            pick = addHours(PickupTimePrevHours, row.visitTime);
          }
        }
        if (pick < min) {
          min = pick;
          minChanged = true;
        }
      }
    }
    if (minChanged) {
      this.selectedPickupTime = min;
    }
    // console.log(min);
    // console.log(this.selectedPickupTime);
  }
  selectionAllChanged() {

  }

  async showDriverFeedback(r: ride4UsherSetDriver) {
    await this.dialog.error(r.dFeedback);
  }

  async accept4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has approved`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.w4_Start;
      await ride.save();
      r.status = ride.status.value;
      r.w4Accept = ride.isWaitingForAccept();
      r.w4Start = ride.isWaitingForStart();
      r.w4Pickup = ride.isWaitingForPickup();
      r.w4Arrived = ride.isWaitingForArrived();
      r.notActiveYet = ride.isNotActiveYet();
    }
  }

  async start4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has start`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.w4_Pickup;
      await ride.save();
      r.status = ride.status.value;
      r.w4Accept = ride.isWaitingForAccept();
      r.w4Start = ride.isWaitingForStart();
      r.w4Pickup = ride.isWaitingForPickup();
      r.w4Arrived = ride.isWaitingForArrived();
      r.notActiveYet = ride.isNotActiveYet();
    }
  }

  async pickup4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has pickup`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.w4_Arrived;
      await ride.save();
      r.status = ride.status.value;
      r.w4Accept = ride.isWaitingForAccept();
      r.w4Start = ride.isWaitingForStart();
      r.w4Pickup = ride.isWaitingForPickup();
      r.w4Arrived = ride.isWaitingForArrived();
      r.notActiveYet = ride.isNotActiveYet();
    }
  }

  async arrived4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has Arrived`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.Succeeded;
      await ride.save();
      r.status = ride.status.value;
      r.w4Accept = ride.isWaitingForAccept();
      r.w4Start = ride.isWaitingForStart();
      r.w4Pickup = ride.isWaitingForPickup();
      r.w4Arrived = ride.isWaitingForArrived();
      r.notActiveYet = ride.isNotActiveYet();

      if (ride.isBackRide.value) {

      }
      else {
        let back: Ride;
        if (!(ride.hadBackRide())) {
          back = await ride.createBackRide();
          ride.backId.value = back.id.value;
          await ride.save();
        }
        else {
          back = await this.context.for(Ride).findId(ride.backId.value);
        }
        back.status.value = RideStatus.InHospital;
        await back.save();
      }
      await this.retrieve();
    }
  }

  async end4Driver(r: ride4UsherSetDriver) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has succeeded`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.rid);
      ride.status.value = RideStatus.Succeeded;
      await ride.save();
      r.status = ride.status.value;
      r.w4Accept = ride.isWaitingForAccept();
      r.w4Start = ride.isWaitingForStart();
      r.w4Pickup = ride.isWaitingForPickup();
      r.w4Arrived = ride.isWaitingForArrived();
      r.notActiveYet = ride.isNotActiveYet();
      // remove from list
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
      ride.did.value = '';
      ride.status.value = RideStatus.w4_Driver;
      await ride.save();
      r.driver = '';
      r.driverId = '';
      r.freeSeats = undefined;
      r.status = RideStatus.w4_Driver;
    }
  }

  async splitRide(r: ride4UsherSetDriver) {
    let ride = await this.context.for(Ride).findId(r.id);
    let explain = new StringColumn();
    let count = new NumberColumn({ defaultValue: ride.passengers() });
    let splitCount = new NumberColumn({
      defaultValue: 2 /*ride.passengers()*/,
      valueChange: () => {
        let splitingExplain = '';
        if (splitCount.value > 1 && splitCount.value <= count.value) {
          let rides: number[] = [];
          for (let i = 0; i < count.value; ++i) {
            let index = i % splitCount.value;
            if (rides.length === index) {
              rides.push(0);
            }
            rides[index] += 1;
          }
          splitingExplain = `${rides.join(',')}`;//times//(Rides: ${rides.length})
          // let mod = count.value % 2;//6=1,1,1,1,1,2 | 5=1,1,1,1,2 | 2=1,5
          // let times = (count.value - mod);// Math.ceil(count.value / splitCount.value);
          // splitingExplain = `${splitCount.value} Rides(${1} pass each)`;//times
          // if (mod > 0) {
          //   splitingExplain += ` & 1 Ride (${times - mod} pass)`;
          // }
        }
        else {
          splitingExplain = 'Not Valid';
        }
        explain.defs.caption = `Split Passengers To ${splitCount.value} Rides`;
        explain.value = splitingExplain;
      }
    });
    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: `Split ${r.patient}\`s Escorts`,
        columnSettings: () => [
          { column: count, readOnly: true, caption: 'Current Total Passengers' },
          { column: splitCount, caption: 'Split Passengers To X Rides' },
          { column: explain, readOnly: true, caption: 'Passengers Spliting' },
        ],
        validate: async () => {
          if (splitCount.value <= 1) {
            splitCount.validationError = ' Split not valid';
            throw splitCount.defs.caption + splitCount.validationError;
          }
          if (splitCount.value > count.value) {
            splitCount.validationError = ' Can not split more then ' + count.value + ' rides';
            throw splitCount.defs.caption + splitCount.validationError;
          }
        },
        ok: async () => {
          let yes = await this.dialog.yesNoQuestion(`Split ride to ${splitCount.value} rides`);
          if (yes) {
            let pass = explain.value.split(',').map(cur => parseInt(cur));
            if (pass.length > 1) {//only one = the same existing ride
              for (let i = 0; i < pass.length; ++i) {
                if (i == pass.length - 1) {//last
                  ride.isSplitted.value = true;
                  ride.escortsCount.value = pass[i] - 1;
                  await ride.save();
                }
                else {
                  let copy = this.context.for(Ride).create();
                  ride.copyTo(copy);
                  // copy.isHasWheelchair.value = false;
                  // copy.isHasBabyChair.value = false;
                  copy.isSplitted.value = true;
                  copy.escortsCount.value = pass[i] - 1;
                  await copy.save();
                }
              }
              await this.retrieve();
            }
          }
        },
        cancel: () => { }
      },
    )
  }

  async editRide(r: ride4UsherSetDriver) {
    await this.context.openDialog(RideCrudComponent, dlg => dlg.args = {
      rid: r.rid
    });
  }

  // [{ column: ride.isHasBabyChair, readOnly: true, clickIcon: 'child_friendly', caption: '?' },
  // { column: ride.isHasWheelchair, readOnly: true, clickIcon: 'accessible',caption: '?' }],

}
export class ride4UsherSetDriverEntity extends Entity<string> {
  constructor(private context: Context) {
    super("ride4UsherSetDriverEntity");
  }
  id = new StringColumn();
  patientId = new PatientIdColumn(this.context);
  driverId?= new StringColumn();
  selected = new BoolColumn();
  from = new StringColumn();
  to = new StringColumn();
  driver = new StringColumn();
  dMobile = new StringColumn();
  visitTime = new StringColumn();
  passengers = new NumberColumn();
  patient = new StringColumn();
  rid = new StringColumn();
  //status: RideStatus,
  //freeSeats?:number;
  w4Accept = new BoolColumn();
  w4Start = new BoolColumn();
  w4Pickup = new BoolColumn();
  w4Arrived = new BoolColumn();
  w4End = new BoolColumn();
};


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