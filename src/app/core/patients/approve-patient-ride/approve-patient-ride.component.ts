import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, NumberColumn, ServerController, StringColumn } from '@remult/core';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { YesNoQuestionComponent } from '../../../common/yes-no-question/yes-no-question.component';
import { Roles } from '../../../users/roles';
import { Ride, RideStatus } from '../../rides/ride';
import { RideCrudComponent } from '../../rides/ride-crud/ride-crud.component';
import { addDays } from '../../usher/usher';
import { Patient } from '../patient';
import { PatientContactsComponent } from '../patient-contacts/patient-contacts.component';
import { PatientCrudComponent } from '../patient-crud/patient-crud.component';


@ServerController({ key: 'm', allowed: [Roles.matcher, Roles.admin] })
class matcherService {
  date = new DateColumn({ defaultValue: new Date(), valueChange: async () => await this.onChanged() });
  onChanged: () => void;
  constructor(onChanged: () => void) {
    this.onChanged = onChanged;
  }
}


@Component({
  selector: 'app-approve-patient-ride',
  templateUrl: './approve-patient-ride.component.html',
  styleUrls: ['./approve-patient-ride.component.scss']
})
export class ApprovePatientRideComponent implements OnInit {

  age = new NumberColumn({ caption: 'Age' });
  pass = new NumberColumn();
  params = new matcherService(async () => await this.refresh());
  ridesSettings = this.context.for(Ride).gridSettings({
    where: r => r.date.isEqualTo(this.params.date)
      .and(r.status.isNotIn(RideStatus.succeeded)),
    numOfColumnsInGrid: 10,
    columnSettings: (r) => [
      r.patientId,
      { column: this.age, readOnly: true, getValue: (cur) => { return this.context.for(Patient).lookup(cur.patientId).age.value; } },
      // r.driverId,
      r.fid,
      r.tid,
      { column: this.pass, getValue: (cur) => { return cur.passengers(); }, caption: 'Pass' },
      r.status,
      // r.date,
      r.visitTime,//,
      r.rRemark,
      // { column: r.mApproved, caption: 'Approved' }
    ],
    rowButtons: [
      {
        textInMenu: 'Approve',
        icon: 'how_to_reg',
        click: async (r) => { await this.approve(r); },
        visible: (r) => { return r.status.value === RideStatus.waitingForStart && !r.mApproved.value }
      },
      {
        textInMenu: 'Edit Ride',
        icon: 'how_to_reg',
        click: async (r) => { await this.openRide(r); }
        //visible: (r) => { return r.status.value === RideStatus.waitingForStart && !r.mApproved.value },
      },
      {
        textInMenu: 'Edit Patient',
        icon: 'how_to_reg',
        click: async (r) => { await this.openPatient(r); }
        //visible: (r) => { return r.status.value === RideStatus.waitingForStart && !r.mApproved.value },
      },
    ]
  });

  constructor(private context: Context) {
    // SetTime: 00:00:00.0 = MidNigth
    this.params.date.value = new Date(this.params.date.value.getFullYear(), this.params.date.value.getMonth(), this.params.date.value.getDate());
  }

  async refresh() {
    this.ridesSettings.reloadData();
  }

  static async retrieve() {

  }

  ngOnInit() {
  }

  async approve(r: Ride) {
    r.mApproved.value = true;
    await r.save();

    let pName = await (await this.context.for(Patient).findId(r.patientId)).name.value;
    let answer = await this.context.openDialog(YesNoQuestionComponent, ynq => ynq.args = {
      message: `You approved ride! Tell '${pName}' to be at '${r.visitTime}' at '${r.fid.displayValue}'? ()`,
      isAQuestion: true,
    });
    if (answer && answer == true) {
      console.log(`Send Message To: ${pName}, Hi found a ride for you: driver, Please be at 'place' on time 'HH:mm', TX.`);
    }
  }

  async prevDay() {
    this.params.date.value = addDays(-1, this.params.date.value);
  }

  async nextDay() {
    this.params.date.value = addDays(+1, this.params.date.value);
  }


  async openRide(r: Ride) {
    await this.context.openDialog(RideCrudComponent, thus => thus.args = {
      rid: r.id.value,
    });
    // let pAge = new NumberColumn({caption: 'Age'});
    // let lock = ![RideStatus.waitingForAccept, RideStatus.waitingForDriver].includes(r.status.value);
    // await this.context.openDialog(
    //   InputAreaComponent,
    //   x => x.args = {
    //     title: `Edit Ride: (${r.status.value.id})`,// ${p.name.value} (age: ${p.age.value})`,
    //     columnSettings: () => [
    //       { column: r.fid, readonly: lock },
    //       // [{ column: new StringColumn(), clickIcon: 'vertical_align_center', click: () => this.swapLocations(r), width: '10' }, {column: new StringColumn({defaultValue: '                                                '})}],
    //       { column: r.tid, readonly: lock }, 
    //       r.immediate,
    //       [
    //         { column: r.date, visible: () => { return !r.immediate.value; } },
    //         { column: r.visitTime, visible: () => { return !r.immediate.value; } }
    //       ],
    //       [
    //         { column: r.escortsCount },
    //         { column: pAge, readOnly: true, getValue: () => { return this.context.for(Patient).lookup(r.patientId).age.value; } },
    //       ],
    //       [
    //         r.isHasBabyChair,
    //         r.isHasWheelchair
    //       ],
    //       r.rRemark,
    //       // r.dRemark,
    //     ],
    //     validate: async () => {
    //       if (!(r.fid.value && r.fid.value.length > 0)) {
    //         r.fid.validationError = 'Required';
    //         throw r.fid.defs.caption + ' ' + r.fid.validationError;
    //       }
    //       if (!(r.tid.value && r.tid.value.length > 0)) {
    //         r.tid.validationError = 'Required';
    //         throw r.tid.defs.caption + ' ' + r.tid.validationError;
    //       }
    //       if (!(r.isHasDate())) {
    //         r.date.validationError = 'Required';
    //         throw r.date.defs.caption + ' ' + r.date.validationError;
    //       }
    //       if (r.date.value < addDays(0)) {
    //         r.date.validationError = 'Must be greater or equals today';
    //         throw r.date.defs.caption + ' ' + r.date.validationError;
    //       }
    //       if (!(r.isHasVisitTime())) {
    //         r.visitTime.validationError = 'Required';
    //         throw r.visitTime.defs.caption + ' ' + r.visitTime.validationError;
    //       }
    //     },
    //     buttons: [
    //       {
    //         text: 'Contacts',
    //         click: async () => await this.openContacts(r)
    //       },
    //       {
    //         text: 'Swap Locations',
    //         click: async () => await this.swapLocations(r)
    //       }
    //     ],
    //     ok: async () => {
    //       await r.save();
    //     }
    //   },
    // )
  }

  async openPatient(r: Ride) {
    await this.context.openDialog(PatientCrudComponent, thus => thus.args = {
      pid: r.patientId.value,
    });
  }

  async openContacts(r: Ride) {

    this.context.openDialog(PatientContactsComponent, sr => sr.args = {
      pid: r.patientId.value,
    });
  }

  async swapLocations(r: Ride){
    let temp = r.fid.value;
    r.fid.value = r.tid.value;
    r.tid.value = temp;
  }

}
