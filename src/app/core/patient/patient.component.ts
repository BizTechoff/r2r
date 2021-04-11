import { Component, OnInit } from '@angular/core';
import { Column, Context, DataAreaSettings } from '@remult/core';
import { Driving } from '../driving/driving';
import { DrivingMatcher } from '../driving/drivingMatcher';
import { Patient } from './patient';

@Component({
  selector: 'app-patient',
  templateUrl: './patient.component.html',
  styleUrls: ['./patient.component.scss']
})
export class PatientComponent implements OnInit {

  patient = this.context.for(Patient).create();
  // patientSettings = new DataAreaSettings({
  //   columnSettings: () => [
  //     this.patient.name,//todo: readonly
  //     // this.patient.idNumber,
  //     // this.patient.mobile,
  //     // [this.patient.defaultBorderCrossing,
  //     // this.patient.defaultHospital],
  //     // [this.patient.fromHour, this.patient.toHour],
  //     // this.patient.isNeedWheelchair,
  //     // [this.patient.isHasEscort, this.patient.escortsCount],
  //   ]
  // });

  driving = this.context.for(Driving).create();
  patientMatchesSettings = new DataAreaSettings({
    columnSettings: () => [
      // this.patientMatches.hospital,
      //   this.patientMatches.borderCrossing,
      this.driving.from_,
      this.driving.to_,
      this.driving.isNeedAlsoReturnDriving,
      this.driving.date,
      this.driving.dayPeriod,
      this.driving.isNeedWheelchair,
      this.driving.isHasEscort,
      this.driving.escortsCount,
    ],
  });


  constructor(private context: Context) { }

  args: {
    patient: Patient,
  };

  ngOnInit() {
    this.patient = this.args.patient;
    this.driving.patientId.value =
      this.patient.id.value;
    this.driving.from_.value =
      this.patient.defaultBorderCrossing.value;
    this.driving.to_.value =
      this.patient.defaultHospital.value;
  }

  async submit() {
    // await this.patient.save();
    await this.driving.save();
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
