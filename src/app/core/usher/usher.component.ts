import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { Driver } from '../drivers/driver';
import { Location } from '../locations/location';
import { Patient } from '../patients/patient';
import { Ride, RideStatus } from '../rides/ride';

@Component({
  selector: 'app-usher',
  templateUrl: './usher.component.html',
  styleUrls: ['./usher.component.scss']
})
export class UsherComponent implements OnInit {

  drivers: Driver[] = [];
  patients: Patient[] = [];

  constructor(private context: Context) {
    this.retrieve();
  }

  driversSettings = this.context.for(Driver).gridSettings({

  });
  ridesSettings = this.context.for(Patient).gridSettings({

  });

  ngOnInit() {
  }

  async retrieve(fromDb = true) {
    if (fromDb || this.drivers.length == 0) {
      this.drivers = await this.context.for(Driver).find();
      this.patients = await this.context.for(Patient).find();
    }
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
      let fromName = this.context.for(Location).findId(ride.from.value);
      let toName = this.context.for(Location).findId(ride.to.value);

      let message = `Hi, please 
        Collect-'${(patientName)}' 
        From-${(fromName)} 
        To-${(toName)} 
        At-${(ride.date)} ${(ride.dayPeriod)} 
        , Thanks
        for more details click ${("https://riding/" + ride.id.value)}`;

      this.SendSms(mobile, message);
    }

    this.retrieve();
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
