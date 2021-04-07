import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings } from '@remult/core';
import { Patient } from './patient';

@Component({
  selector: 'app-patient',
  templateUrl: './patient.component.html',
  styleUrls: ['./patient.component.scss']
})
export class PatientComponent implements OnInit {

  patient = this.context.for(Patient).create();
  patientSettings = new DataAreaSettings({
    columnSettings: () => [
      this.patient.name,
      this.patient.idNumber,
      this.patient.mobile,
      [this.patient.fromAddress, this.patient.toAddress],
      [this.patient.fromHour, this.patient.toHour],
      this.patient.isNeedWheelchair,
      [this.patient.isHasEscort, this.patient.escortsCount],
    ]});

  constructor(private context: Context) { }

  ngOnInit() {
  }

  async submit(){
    await this.patient.save();
  }

}
