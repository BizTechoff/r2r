import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, Filter, ServerController, ServerMethod } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { getRideList4UsherParams, ride4UsherApprove } from '../../../shared/types';
import { Driver, openDriver } from '../../drivers/driver';
import { Location, LocationIdColumn } from '../../locations/location';
import { Patient } from '../../patients/patient';
import { PatientCrudComponent } from '../../patients/patient-crud/patient-crud.component';
import { Ride, RideStatus } from '../../rides/ride';
import { rideRow } from '../set-driver/set-driver.component';
import { SuggestDriverComponent } from '../suggest-driver/suggest-driver.component';
import { Usher } from '../usher';

export class UsherRowStatus {
  static noDriver = new UsherRowStatus();
  static approve4Driver = new UsherRowStatus();
  static backRide = new UsherRowStatus();
  static all = new UsherRowStatus();
}


@ServerController({ key: 'usherShowRides', allowed: true })
class usherShowRides {//dataControlSettings: () => ({width: '150px'}), 
  date = new DateColumn({ defaultValue: new Date(), valueChange: async () => { await this.onChanged(); } });
  fid = new LocationIdColumn({ valueChange: async () => { await this.onChanged(); } }, this.context);
  tid = new LocationIdColumn({ valueChange: async () => { await this.onChanged(); } }, this.context);
  constructor(private context: Context) { }
  ready = false;
  onChanged = async () => {};
  
  @ServerMethod()
  async retrieveRideList4Usher(): Promise<ride4UsherApprove[]> {
    var result: ride4UsherApprove[] = [];
        for await (const ride of this.context.for(Ride).iterate({
            where: r => r.date.isEqualTo(this.date)
            .and(r.status.isNotIn(...[RideStatus.succeeded]))
            .and(this.fid.value ? r.fromLocation.isEqualTo(this.fid) : new Filter(x => { /* true */ }))
            .and(this.tid.value ? r.toLocation.isEqualTo(this.tid) : new Filter(x => { /* true */ })),
        })) { 
            let from = (await this.context.for(Location).findId(ride.fromLocation.value)).name.value;
            let to = (await this.context.for(Location).findId(ride.toLocation.value)).name.value;
            let dName= '';
            let dMobile = '';
            if(ride.isHasDriver()){
                let driver = await this.context.for(Driver).findId(ride.driverId.value);
                dName = driver.name.value;
                dMobile =driver.mobile.value;
            }
            let patient= ride.isHasPatient()? (await this.context.for(Patient).findId(ride.patientId.value)).name.value : "";

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
                    dMobile: dMobile,
                    passengers: ride.passengers(),
                    selected: false,
                    visitTime: ride.visitTime.value,
                    status: ride.status.value.id,
                }; 
                result.push(row);
            }
        }

        // console.log(result)
        result.sort((r1, r2) => r1.from.localeCompare(r2.from));

        return result;
  }
}

@Component({
  selector: 'app-show-rides',
  templateUrl: './show-rides.component.html',
  styleUrls: ['./show-rides.component.scss']
})
export class ShowRidesComponent implements OnInit {

  params = new usherShowRides(this.context);

  protected fromName: string;
  protected toName: string;
  protected rides: ride4UsherApprove[];
  args: {
    date: Date,
    from: string,
    to: string,
    status: UsherRowStatus,
  };
  constructor(protected context: Context, private dialog: DialogService) { }

  async ngOnInit() {
    this.params.date.value = this.args.date;
    this.params.fid.value = this.args.from;
    this.params.tid.value = this.args.to;

    this.fromName = (await this.context.for(Location).findId(this.args.from)).name.value;
    this.toName = (await this.context.for(Location).findId(this.args.to)).name.value;

    await this.retrieve();
  }

  async retrieve() {
    let params: getRideList4UsherParams = {
      date: this.args.date,
      fromId: this.args.from,
      toId: this.args.to,
    };

    this.rides = [];
    this.params.onChanged = async () => {};
    for await (const r of await this.params.retrieveRideList4Usher()) {
      switch (this.args.status) {
        case UsherRowStatus.noDriver:
          {
            if (r.driverId && r.driverId.length) {
              this.rides.push(r);
            }
            break;
          }
        case UsherRowStatus.approve4Driver:
          {
            if (r.status === 'waitingForAccept') {
              this.rides.push(r);
            }
            break;
          }
        case UsherRowStatus.backRide:
          {

            break;
          }
        default:
          {
            this.rides.push(r);
            break;
          }
      }
    };
    this.params.onChanged =  async() => {await this.retrieve();};
  }

  async openPatient(r: ride4UsherApprove) {
    await this.context.openDialog(PatientCrudComponent, thus => thus.args = {
      pid: r.patientId, isNew: false,
    });
    // openPatient(r.patientId, this.context);
  }

  async openDriver(r: ride4UsherApprove) {
    openDriver(r.driverId, this.context);
  }

  async accept4Driver(r: ride4UsherApprove) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has approved`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.id);
      ride.status.value = RideStatus.waitingForStart;
      await ride.save();
      r.status = RideStatus.waitingForStart.id;
    }
  }

  async start4Driver(r: ride4UsherApprove) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has start`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.id);
      ride.status.value = RideStatus.waitingForPickup;
      await ride.save();
      r.status = RideStatus.waitingForPickup.id;
    }
  }

  async pickup4Driver(r: ride4UsherApprove) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has pickup`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.id);
      ride.status.value = RideStatus.waitingForArrived;
      await ride.save();
      r.status = RideStatus.waitingForArrived.id;
    }
  }

  async arrived4Driver(r: ride4UsherApprove) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has Arrived`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.id);
      ride.status.value = RideStatus.waitingForEnd;
      await ride.save();
      r.status = RideStatus.waitingForEnd.id;
    }
  }

  async end4Driver(r: ride4UsherApprove) {
    let setStatusToApproved = await this.dialog.yesNoQuestion(`Set ${r.driver} Has succeeded`);
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.id);
      ride.status.value = RideStatus.succeeded;
      await ride.save();
      //r.status = RideStatus.succeeded.id;
      let i = this.rides.indexOf(r);
      if (i >= 0) {
        this.rides.splice(i, 1);
      } 
    }
  }

  async removeDriver(r: ride4UsherApprove) {
    let setStatusToApproved = await this.dialog.confirmDelete(r.driver + ' from selected ride');
    if (setStatusToApproved) {
      let ride = await this.context.for(Ride).findId(r.id);
      ride.driverId.value = '';
      ride.status.value = RideStatus.waitingForDriver;
      await ride.save();
      r.driver = '';
      r.driverId = '';
      r.status = RideStatus.waitingForDriver.id;
    }
  }

  async setDriver(r: ride4UsherApprove) {
    let selected = await this.context.openDialog(SuggestDriverComponent,
      sd => sd.args = { rId: r.id, },
      d => d.selected);
    if (selected.did.length > 0) {
      let d = await this.context.for(Driver).findId(selected.did);
      if (d) {
        r.driverId = d.id.value;
        r.driver = d.name.value;
        r.dMobile = d.mobile.value;
        r.status = selected.status;
      }
    }
  }

  async approveDriver(r: rideRow) {

    let ride = await this.context.for(Ride).findId(r.id);
    ride.status.value = RideStatus.waitingForStart;
    await ride.save();

    // let setStatusToApproved = this.dialog.yesNoQuestion("Set status To approved-by-driver");
    // for (const r of this.rides) {
    //   if (r.selected) {
    //     let ride = await this.context.for(Ride).findId(r.id);
    //     // ride.visitTime.value = 
    //     ride.driverId.value = this.driverId.value;
    //     if (setStatusToApproved) {
    //       ride.status.value = RideStatus.waitingForStart;
    //     }
    //     await ride.save();
    //   }
    // }
  }
}