import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction } from '@remult/core';
import { Roles } from '../../users/roles';
import { Driver } from '../drivers/driver';
import { Location } from '../locations/location';
import { Patient } from '../patients/patient';
import { Ride, RideStatus } from '../rides/ride';
import { MabatGroupBy } from './mabat';
import { Usher, UsherRideGroup } from './usher';

@Component({
  selector: 'app-usher',
  templateUrl: './usher.component.html',
  styleUrls: ['./usher.component.scss']
})
export class UsherComponent implements OnInit {

  rides:UsherRideGroup;
  clientLastRefreshDate: Date = new Date();
  demoToday:Date;
  static lastRefreshDate: Date = new Date();//client time

  constructor(private context: Context) { }

  async ngOnInit() {
    this.clientLastRefreshDate = new Date();
    this.demoToday = Usher.demoTodayMidnight;
    await this.refresh();
  }

  async refresh(){
    this.rides = await UsherComponent.retrieve();
  }

  @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
  static async retrieve(fromDb = true, context?:Context): Promise<UsherRideGroup> {
    let result:UsherRideGroup = {title: "Not Found Rides", rows: [], groups: [], field: MabatGroupBy.none  };
    UsherComponent.lastRefreshDate = new Date();//server date
    if (fromDb) {
      result = await Usher.getRides4Usher('',context);
    }
    return result;
  }

  async assignSelected() {

  }

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
