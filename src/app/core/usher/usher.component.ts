import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { Driver } from '../driver/driver';
import { Patient } from '../patient/patient';

@Component({
  selector: 'app-usher',
  templateUrl: './usher.component.html',
  styleUrls: ['./usher.component.scss']
})
export class UsherComponent implements OnInit {

  drivers: Driver[] = [];
  patients: Patient[] = [];

  constructor(private context: Context) { 
    
  }

  ngOnInit() {
    this.retrieve();
  }

  async retrieve(fromDb = true) {
    if (fromDb || this.drivers.length == 0) {
      this.drivers = await this.context.for(Driver).find();
      this.patients = await this.context.for(Patient).find();
    }
  }

  async assign(notify = false) {
    let driver = this.getSelectedDriver();
    let patient = this.getSelectedPatient();

    patient.driverId.value = driver.id.value;
    patient.assignChanged.value = new Date();
    await patient.save();

    if (notify) {
      let mobile = driver.mobile.value;
      let message = `${(patient.name)}-${(patient.mobile)}`;

      this.SendSms(mobile, message);
    }

    this.retrieve();
  }

  getSelectedDriver(): Driver {
    return new Driver();
  }

  getSelectedPatient(): Patient {
    return new Patient(this.context);
  }

  async SendSms(mobile: string, message: string) {
    await console.info(`Sms '${(message)}' sent to '${(mobile)}'`)
  }


}
