import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, NumberColumn, ServerController, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { YesNoQuestionComponent } from '../../../common/yes-no-question/yes-no-question.component';
import { addDays, resetTime } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { LocationType } from '../../locations/location';
import { Ride, RideStatus } from '../../rides/ride';
import { RideCrudComponent } from '../../rides/ride-crud/ride-crud.component';
import { SendSmsComponent } from '../../services/send-sms/send-sms.component';
import { Patient } from '../patient';
import { PatientContactsComponent } from '../patient-contacts/patient-contacts.component';
import { PatientCrudComponent } from '../patient-crud/patient-crud.component';


@ServerController({ key: 'm/rides', allowed: [Roles.matcher, Roles.admin] })
class matcherService {
  date = new DateColumn({ defaultValue: new Date(), valueChange: async () => await this.onChanged() });
  onChanged: () => void;
  constructor(onChanged: () => void) {
    this.onChanged = onChanged;
  }
}


@Component({
  selector: 'app-patient-rides',
  templateUrl: './patient-rides.component.html',
  styleUrls: ['./patient-rides.component.scss']
})
export class PatientRidesComponent implements OnInit {

  vt = new StringColumn({ caption: 'Visit Time' });
  age = new NumberColumn({ caption: 'Age' });
  pass = new NumberColumn();
  params = new matcherService(async () => await this.refresh());
  ridesSettings = this.context.for(Ride).gridSettings({
    where: r => r.date.isEqualTo(this.params.date)
      .and(r.status.isNotIn(RideStatus.succeeded)),
    orderBy: (cur) => [{ column: cur.visitTime, descending: true }, { column: cur.patientId, descending: true }, { column: cur.changed, descending: true }],
    numOfColumnsInGrid: 10,
    columnSettings: (cur) => [
      cur.patientId,
      { column: this.age, readOnly: true, getValue: (cur) => { return this.context.for(Patient).lookup(cur.patientId).age.value; } },
      // r.driverId,
      cur.fid,
      cur.tid,
      { column: this.pass, getValue: (cur) => { return cur.passengers(); }, caption: 'Pass' },
      cur.status,
      // r.date,
      { column: this.vt, getValue: (r) => r.immediate.value ? 'A.S.A.P' : r.visitTime.value },
      // r.visitTime,//,
      cur.rRemark,
      cur.changed,
      cur.changedBy
      // { column: r.mApproved, caption: 'Approved' }
    ],
    rowButtons: [
      {
        textInMenu: 'Approve',
        icon: 'how_to_reg',
        click: async (cur) => { await this.approve(cur); },
        visible: (cur) => { return cur.status.value === RideStatus.waitingForStart && !cur.mApproved.value }
      },
      {
        textInMenu: 'Edit Ride',
        icon: 'how_to_reg',
        click: async (cur) => { await this.openRide(cur); }
        //visible: (cur) => { return cur.status.value === RideStatus.waitingForStart && !cur.mApproved.value },
      },
      {
        textInMenu: 'Edit Patient',
        icon: 'how_to_reg',
        click: async (cur) => { await this.openPatient(cur); }
        //visible: (r) => { return r.status.value === RideStatus.waitingForStart && !r.mApproved.value },
      },
      {
        textInMenu: 'Add Back Ride',
        icon: 'back',
        click: async (cur) => { await this.createBackRide(cur); },
        //visible: (cur) => { return (!cur.hadBackRide()) && cur.fid.hasSelected() && cur.fid.selected.type === LocationType.border; },
      },
      {
        textInMenu: 'Delete Ride',
        icon: 'delete',
        click: async (cur) => { await this.deleteRide(cur); },
        //visible: (cur) => { return (!cur.hadBackRide()) && cur.fid.hasSelected() && cur.fid.selected.type === LocationType.border; },
      },
      {
        textInMenu: 'Send Message',
        icon: 'send',
        click: async (cur) => { await this.sendMessage(cur); },
        //visible: (cur) => { return (!cur.hadBackRide()) && cur.fid.hasSelected() && cur.fid.selected.type === LocationType.border; },
      }
    ]
  });

  constructor(private context: Context, private dialog: DialogService) {
    // SetTime: 00:00:00.0 = MidNigth
    this.params.date.value = resetTime(this.params.date.value);
  }


  async sendMessage(r: Ride) {
    let message = 'תואמה לך נסיעה מחר ממחסום, בית חולים שעה וכו...';
    //message = 'Hi ..'
    console.log(`Send message to patient: ${message}`);

    await this.context.openDialog(SendSmsComponent, sms => sms.args = {
      mobile: '0526526063',
      message: message
    });
  }
  
  async deleteRide(r: Ride) {
    if (RideStatus.isDriverStarted.includes(r.status.value)) {
      let yes = await this.dialog.confirmDelete(' Ride');
      if (yes) {
        await r.delete();
      }
    } else {
      await this.dialog.error('Driver Started Ride, Can NOT delete');
    }
  }

  async createBackRide(r: Ride) {
    if (r.hadBackRide()) {
      await this.dialog.error('Back ride Already created');
    } else if (!(r.fid.hasSelected() && r.fid.selected.type.value === LocationType.border)) {
      await this.dialog.error('Back ride can created only from-border');
    }
    else {
      await r.createBackRide();
    }
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

}
