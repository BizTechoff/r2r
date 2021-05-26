import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, Filter, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { getRideList4UsherParams, ride4UsherApprove } from '../../../shared/types';
import { Driver, openDriver } from '../../drivers/driver';
import { Location } from '../../locations/location';
import { Patient } from '../../patients/patient';
import { PatientCrudComponent } from '../../patients/patient-crud/patient-crud.component';
import { Ride, RideStatus } from '../../rides/ride';
import { rideRow } from '../set-driver/set-driver.component';
import { Usher } from '../usher';



@ServerController({ key: 'usherAccept4Driver', allowed: true })
class usherAccept4Driver {
  date = new DateColumn();
  fid = new StringColumn();
  tid = new StringColumn();
  constructor(private context: Context){}

  @ServerMethod()
  async retrieveRideList4UsherSetDriver(): Promise<ride4UsherApprove[]> {
    var result: ride4UsherApprove[] = [];
    
        for await (const ride of this.context.for(Ride).iterate({
            where: r => r.date.isEqualTo(this.date)
            .and(r.status.isNotIn(...[RideStatus.succeeded]))
            .and(this.fid.value ? r.fid.isEqualTo(this.fid) : new Filter(x => { /* true */ }))
            .and(this.tid.value ? r.tid.isEqualTo(this.tid) : new Filter(x => { /* true */ })),
        })) { 
            let from = (await this.context.for(Location).findId(ride.fid.value)).name.value;
            let to = (await this.context.for(Location).findId(ride.tid.value)).name.value;
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
  selector: 'app-approve-driver',
  templateUrl: './approve-driver.component.html',
  styleUrls: ['./approve-driver.component.scss']
})
export class ApproveDriverComponent implements OnInit {

  params = new usherAccept4Driver(this.context);

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

    this.rides = await this.params.retrieveRideList4UsherSetDriver();
  }

  async openPatient(r: ride4UsherApprove) {
    await this.context.openDialog(PatientCrudComponent, thus => thus.args = {
      pid: r.patientId,
    });
    // openPatient(r.patientId, this.context);
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