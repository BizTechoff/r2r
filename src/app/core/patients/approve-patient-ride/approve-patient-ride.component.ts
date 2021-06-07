import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, NumberColumn, ServerController, StringColumn } from '@remult/core';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { YesNoQuestionComponent } from '../../../common/yes-no-question/yes-no-question.component';
import { addDays, resetTime } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { Ride, RideStatus } from '../../rides/ride';
import { RideCrudComponent } from '../../rides/ride-crud/ride-crud.component';
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
    this.params.date.value = resetTime(this.params.date.value);
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

  async swapLocations(r: Ride) {
    let temp = r.fid.value;
    r.fid.value = r.tid.value;
    r.tid.value = temp;
  }

}
