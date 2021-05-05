import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction } from '@remult/core';
import { Roles } from '../../users/roles';
import { Driver, openDriver } from '../drivers/driver';
import { Location } from '../locations/location';
import { openPatient, Patient } from '../patients/patient';
import { addRide, openRide, Ride, RideStatus } from '../rides/ride';
import { MabatGroupBy } from './mabat';
import { Usher, UsherRideGroup, UsherRideRow } from './usher';

@Component({
  selector: 'app-usher',
  templateUrl: './usher.component.html',
  styleUrls: ['./usher.component.scss']
})
export class UsherComponent implements OnInit {

  rides:UsherRideGroup; 
  clientLastRefreshDate: Date = new Date();
  demoDates:string;
  static lastRefreshDate: Date = new Date();//client time

  constructor(public context: Context) { }

  async ngOnInit() {
    this.clientLastRefreshDate = new Date();
    this.demoDates = `${formatDate(Usher.fromDemoTodayMidnight, "dd/MM/yyy", "en-US")} - ${formatDate(Usher.toDemoTodayMidnight, "dd/MM/yyy", "en-US")}`;
    await this.refresh();
  }

  async refresh(){
    this.rides = await UsherComponent.retrieveUsherRides();
  }
 
  async addRide(){
    let changed = await addRide('', this.context);
  }
  
  @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
  static async retrieveUsherRides(fromDb = true, context?:Context): Promise<UsherRideGroup> {
    let result:UsherRideGroup = {title: "Not Found Rides", rows: [], groups: [], field: MabatGroupBy.none  };
    UsherComponent.lastRefreshDate = new Date();//server date
    if (fromDb) {
      result = await Usher.getRides4Usher('',context);
    }
    return result;
  }

  async assignSelected() {

  }

  async addPatient(r:UsherRideRow){}
  async addDriver(r:UsherRideRow){}
  async editRide(r:UsherRideRow){
    console.log(r);
    let changed = await openRide(r.id, this.context);
    if(changed){
      // let ride = await this.context.for(Ride).findId(r.id);
      // r.pid = ride.patientId.value;
      // // r.pAge = ride.age();
      // r.passengers = ride.passengers();
      // // r.icons = ride.patientId.value;
      // r.did = ride.driverId.value;
      // r.status = ride.status.value;
    }
  }
  async editPatient(r:UsherRideRow){
    let changed = await openPatient(r.pid, this.context);
  }
  async editDriver(r:UsherRideRow){
    let changed = await openDriver(r.did, this.context);}
  async approoveRide(r:UsherRideRow){}
  async suggestPatient(r:UsherRideRow){}
  async suggestDriver(r:UsherRideRow){}


  async assign(ride: Ride, driver: Driver, notify = false) {

    ride.driverId.value = driver.id.value;
    ride.status.value = RideStatus.waitingForStart;
    await ride.save();

    if (notify) {
      let mobile = driver.mobile.value;
      let patientName = this.context.for(Patient).findId(ride.patientId.value);
      let fromName = this.context.for(Location).findId(ride.fromLocation.value);
      let toName = this.context.for(Location).findId(ride.toLocation.value);

      let message = `Hi, please 
        Collect-'${(patientName)}' 
        From-${(fromName)} 
        To-${(toName)} 
        At-${(ride.date)} ${(ride.dayPeriod)} 
        , Thanks
        for more details click ${("https://riding/" + ride.id.value)}`;

      this.SendSms(mobile, message);
    }

    //Usher.retrieve();
  }

  getSelectedDrivers(): Driver[] {
    return new Driver[0];
  }

  getSelectedPatients(): Patient[] {
    return new Patient[0];
  }

  async SendSms(mobile: string, message: string) {
    await console.info(`Sms '${(message)}' sent to '${(mobile)}'`)
  }

}
