import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { Driver } from '../drivers/driver';
import { Patient } from '../patients/patient';

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
  patientsSettings = this.context.for(Patient).gridSettings({
    
  });

  ngOnInit() {
  }

  async retrieve(fromDb = true) {
    if (fromDb || this.drivers.length == 0) {
      this.drivers = await this.context.for(Driver).find();
      this.patients = await this.context.for(Patient).find();
    }
  }

  async assignSelected(){
    
  }

  async assign(patient: Patient, driver: Driver, notify = false) {

    // patient.driverId.value = driver.id.value;
    // patient.assignChanged.value = new Date();
    await patient.save();

    if (notify) {
      let mobile = driver.mobile.value;
      let message = `${(patient.name)}-${(patient.mobile)}`;

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
