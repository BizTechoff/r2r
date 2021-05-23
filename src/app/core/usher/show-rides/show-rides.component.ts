import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { getRideList4UsherParams, ride4UsherApprove } from '../../../shared/types';
import { Driver, openDriver } from '../../drivers/driver';
import { Location } from '../../locations/location';
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

@Component({
  selector: 'app-show-rides',
  templateUrl: './show-rides.component.html',
  styleUrls: ['./show-rides.component.scss']
})
export class ShowRidesComponent implements OnInit {

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
    for await (const r of await Usher.getRideList4UsherApprove(params, this.context)) {
      switch (this.args.status) {
        case UsherRowStatus.noDriver:
          {
            if(r.driverId && r.driverId.length){
              this.rides.push(r);
            }
            break;
          }
        case UsherRowStatus.approve4Driver:
          {
            if(r.status === 'waitingForAccept'){
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
    let ride = await this.context.for(Ride).findId(r.id);
    ride.status.value = RideStatus.waitingForStart;
    await ride.save();
    r.status = RideStatus.waitingForStart.id;
  }

  async removeDriver(r: ride4UsherApprove) {
    let ride = await this.context.for(Ride).findId(r.id);
    ride.driverId.value = '';
    ride.status.value = RideStatus.waitingForDriver;
    await ride.save();
    r.driver = '';
    r.driverId = '';
  }

  async attachDriver(r: ride4UsherApprove) {
    let did = await this.context.openDialog(SuggestDriverComponent,
      sd => sd.args = { rId: r.id, },
      d => d.selectedId);
    if (did.length > 0) {
      let d = await this.context.for(Driver).findId(did);
      if (d) {
        r.driverId = did;
        r.driver = d.name.value;
        r.dMobile = d.mobile.value;
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