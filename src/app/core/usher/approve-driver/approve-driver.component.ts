import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { rideRow } from '../set-driver/set-driver.component';
import { Location } from '../../locations/location';
import { Ride, RideStatus } from '../../rides/ride';
import { Driver } from '../../drivers/driver';
import { Patient } from '../../patients/patient';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-approve-driver',
  templateUrl: './approve-driver.component.html',
  styleUrls: ['./approve-driver.component.scss']
})
export class ApproveDriverComponent implements OnInit {

  protected fromName: string;
  protected toName: string;
  protected rides: rideRow[];
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
    let rows:rideRow[] = [];
    if (this.args) {
      for await (const r of await this.context.for(Ride).find({
        where: (r) => r.date.isEqualTo(this.args.date)
          .and(r.status.isNotIn(...[RideStatus.succeeded]))
          .and(r.fromLocation.isEqualTo(this.args.from))
          .and(r.toLocation.isEqualTo(this.args.to)),
        // .and(to && (to.trim().length > 0) ? r.toLocation.isEqualTo(to) : new Filter(x => { })),
        orderBy: r => r.visitTime,
      })) {
        let driverName = '';
        let driverMobile = '';
        if (r.isHasDriver()) {
          let d= (await this.context.for(Driver).findId(r.driverId.value));
          driverName  = d.name.value;
          driverMobile  = d.mobile.value;
        }
        let patientName = '';
        if (r.isHasPatient()) {
          patientName = (await this.context.for(Patient).findId(r.patientId.value)).name.value;
        }
        let visitTime = '';
        if (r.isHasVisitTime()) {
          visitTime = formatDate(r.visitTime.value, 'HH:mm', 'en-US');
        }
        rows.push({
          id: r.id.value,
          selected: false,
          from: this.fromName,
          to: this.toName,
          driver: driverName,
          dMobile: driverMobile,
          visitTime: visitTime,
          passengers: r.passengers(),
          patient: patientName,
        });
      }
    }
    this.rides = rows;
  }

  async approveDriver(r:rideRow) {
    
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