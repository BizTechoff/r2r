import { Component, OnInit } from '@angular/core';
import { Column, Context, DataAreaSettings } from '@remult/core';
import { DrivingMatcher } from '../driving/drivingMatcher';
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
      [this.patient.fromAddress,
      this.patient.toAddress],
      [this.patient.fromHour, this.patient.toHour],
      this.patient.isNeedWheelchair,
      [this.patient.isHasEscort, this.patient.escortsCount],
    ]
  });

  patientMatches = this.context.for(DrivingMatcher).create();
  patientMatchesSettings = new DataAreaSettings({
    columnSettings: () => [
    // this.patientMatches.hospital,
   //   this.patientMatches.borderCrossing,
      this.patientMatches.fromday,
      this.patientMatches.today,
      this.patientMatches.fromHour,
      this.patientMatches.toHour,
    ],
  });

  constructor(private context: Context) { }

  ngOnInit() {
  }

  async submit() {
    await this.patient.save();
    this.patientMatches.patientId.value = 
      this.patient.id.value;
    await this.patientMatches.save();
  }

  async swapAddresses() {

  }

}



    //   [
    //     this.patient.fromAddress,
    //     {
    //       column: new Column({ caption: "" }),
    //       click: () => this.swapAddresses(),
    //       clickIcon: 'swap_horiz',
    //       width: "0",
    //       // cssClass: "swap-addresses",
    //   },
    //     this.patient.toAddress,
    //   ]

    // ]});
    // patientSettingsAfter = new DataAreaSettings({
    //   columnSettings: () => [


    //     [this.patient.fromHour, this.patient.toHour],
    //     this.patient.isNeedWheelchair,
    //     [this.patient.isHasEscort, this.patient.escortsCount],
