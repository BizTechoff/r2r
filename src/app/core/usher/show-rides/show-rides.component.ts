import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { getRideList4UsherParams, ride4UsherApprove } from '../../../shared/types';
import { openDriver } from '../../drivers/driver';
import { Location } from '../../locations/location';
import { openPatient } from '../../patients/patient';
import { Ride, RideStatus } from '../../rides/ride';
import { rideRow } from '../set-driver/set-driver.component';
import { Usher } from '../usher';

@Component({
  selector: 'app-show-rides',
  templateUrl: './show-rides.component.html',
  styleUrls: ['./show-rides.component.scss']
})
export class  ShowRidesComponent implements OnInit {



  protected fromName: string;
  protected toName: string;
  protected rides: ride4UsherApprove[];
  args: {
    date: Date,
    from: string,
    to: string, 
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

    this.rides = await Usher.getRideList4UsherApprove(params, this.context);
  }

  async openPatient(r: ride4UsherApprove) {
    openPatient(r.patientId, this.context);
  }

  async openDriver(r: ride4UsherApprove) {
    openDriver(r.driverId, this.context);
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