import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, NumberColumn, ServerController, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { YesNoQuestionComponent } from '../../../common/yes-no-question/yes-no-question.component';
import { TODAY } from '../../../shared/types';
import { addDays } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { Ride, RideStatus, RideStatusColumn } from '../../rides/ride';
import { RideCrudComponent } from '../../rides/ride-crud/ride-crud.component';
import { SendSmsComponent } from '../../services/send-sms/send-sms.component';
import { SendWappComponent } from '../../services/send-wapp/send-wapp.component';
import { Patient } from '../patient';
import { PatientContactsComponent } from '../patient-contacts/patient-contacts.component';
import { PatientCrudComponent } from '../patient-crud/patient-crud.component';


@ServerController({ key: 'm/rides', allowed: [Roles.matcher, Roles.admin] })
class matcherService {
  date = new DateColumn({ valueChange: async () => await this.onChanged() });
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
      .and(r.status.isNotIn(RideStatus.Succeeded)),
    orderBy: (cur) => [{ column: cur.visitTime, descending: true }, { column: cur.pid, descending: true }, { column: cur.created, descending: true }],
    numOfColumnsInGrid: 10,
    columnSettings: (cur) => [
      cur.pid,
      // allowClick: () => false, 
      { column: this.age, width: '80', readOnly: true, getValue: (cur) => { return this.context.for(Patient).lookup(cur.pid).age.value; } },
      cur.fid,
      cur.tid,
      { column: this.pass, width: '80', getValue: (cur) => { return cur.passengers(); }, caption: 'Pass' },
      cur.status,
      { column: this.vt, width: '110', getValue: (r) => r.immediate.value ? 'A.S.A.P' : r.visitTime.value },
      cur.did,
      cur.rRemark,
      cur.created,
      cur.createdBy
    ],
    rowButtons: [
      {
        textInMenu: 'Driver Feedback',
        icon: 'comment',
        click: async (cur) => { await this.driverFeedback(cur); },
        visible: (cur) => { return RideStatus.isDriverFeedback.includes(cur.status.value); }
      },
      {
        textInMenu: 'Approve',
        icon: 'how_to_reg',
        click: async (cur) => { await this.approve(cur); },
        visible: (cur) => { return cur.status.value === RideStatus.w4_Start && !cur.isPatientApprovedBeing.value }
      },
      {
        textInMenu: 'Set Status',
        icon: 'new_releases',
        click: async (cur) => { await this.setStatus(cur); },
        visible: (cur) => { return (!(cur.isBackRide.value && cur.status.value !== RideStatus.InHospital && cur.status.value !== RideStatus.NotActiveYet)) }
      },
      {
        textInMenu: 'Edit Ride',
        icon: 'directions_bus_filled',
        click: async (cur) => { await this.openRide(cur); },
        //visible: (cur) => { return cur.status.value === RideStatus.waitingForStart && !cur.mApproved.value },
      },
      // {
      //   textInMenu: 'Add Back Ride',
      //   icon: 'rv_hookup',
      //   click: async (cur) => { await this.createBackRide(cur); },
      //   //visible: (cur) => { return (!cur.hadBackRide()) && cur.fid.hasSelected() && cur.fid.selected.type === LocationType.border; },
      // },
      {
        textInMenu: 'Edit Patient',
        icon: 'how_to_reg',
        click: async (cur) => { await this.openPatient(cur); }
        //visible: (r) => { return r.status.value === RideStatus.waitingForStart && !r.mApproved.value },
      },
      {
        textInMenu: 'Send Message',
        icon: 'send',
        click: async (cur) => { await this.sendMessage(cur); },
        //visible: (cur) => { return (!cur.hadBackRide()) && cur.fid.hasSelected() && cur.fid.selected.type === LocationType.border; },
      },
      {
        textInMenu: 'Delete Ride',
        icon: 'delete',
        click: async (cur) => { await this.deleteRide(cur); },
        //visible: (cur) => { return (!cur.hadBackRide()) && cur.fid.hasSelected() && cur.fid.selected.type === LocationType.border; },
      }
    ]
  });

  constructor(private context: Context, private dialog: DialogService) {
    this.params.date.value = addDays(TODAY);
  }


  async sendMessage(r: Ride) {
    let message = `?????????? ???? ?????????? ????????????`;
    message += '\n';
    message += ` ${r.date.value.toLocaleDateString("he-il")} `;
    message += '\n';
    message += r.fid.selected.type.isBorder() ? `????????????` : `???????? ??????????`;
    message += ` ${r.fid.selected.name.value} `;
    message += '\n';
    message += r.fid.selected.type.isBorder() ? `???????? ??????????` : `????????????`;
    message += ` ${r.tid.selected.name.value} `;
    message += '\n';
    message += `?????????? ?? ${r.tid.selected.name.value} ????????`;
    message += '\n';
    message += ` ${r.pickupTime.value} `;
    message += '\n';
    message += `?????????? ????????????`;
    message += '\n';
    message += ` ${`https://bit.ly/r2r-my-rides`} `;
    //message += ` ${`https://roadtorecovery-app.herokuapp.com/d/rides`} `;
    //message = 'Hi ..'
    console.log(`Send message to patient: ${message}`);
    await this.context.openDialog(SendWappComponent, sms => sms.args = {
      mobile: r.pMobile.value,
      message: message
    });
    // await this.context.openDialog(SendSmsComponent, sms => sms.args = {
    //   mobile: '0526526063',
    //   message: message
    // });
  }

  async deleteRide(r: Ride) {
    if (RideStatus.isDriverNotStarted.includes(r.status.value)) {
      let yes = await this.dialog.confirmDelete(' Ride');
      if (yes) {
        await r.delete();
        await this.refresh();
      }
    } else {
      await this.dialog.error('Driver Started Ride, Can NOT delete');
    }
  }

  // async createBackRide(r: Ride) {
  //   if (r.hadBackRide()) {
  //     await this.dialog.error('Back ride Already created');
  //   } else if (!(r.fid.hasSelected() && r.fid.selected.type.value === LocationType.border)) {
  //     await this.dialog.error('Back ride can created only from-border');
  //   }
  //   else {
  //     await r.createBackRide(this.dialog);
  //   }
  // }

  async refresh() {
    this.ridesSettings.reloadData();
  }

  static async retrieve() {

  }

  ngOnInit() {
  }

  async setStatus(r: Ride) {
    let options = new RideStatusColumn({ defaultValue: RideStatus.FinishedHospital });
    let pName = (await this.context.for(Patient).findId(r.pid)).name.value;
    await this.context.openDialog(InputAreaComponent, dlg => dlg.args = {
      title: 'Set Status Of Patient: ' + pName,
      columnSettings: () => [
        { column: options, valueList: [RideStatus.FinishedHospital, RideStatus.StayInHospital, RideStatus.GoneByHimself] }
      ],
      ok: async () => {
        if (options.value && options.value.id) {
          let message = ``;
          if (options.value === RideStatus.FinishedHospital) {
            message += `This will activate the Patient-back-ride, Ok?`;
          }
          else if (options.value === RideStatus.StayInHospital) {
            message += `This will move the ride for tommorrow, Ok?`;
          }
          else if (options.value === RideStatus.GoneByHimself) {
            message += `This will delete the back-ride, Ok?`;
          }
          let yes = await this.dialog.yesNoQuestion(`${message}`);
          if (yes) {
            r.status.value = options.value;
            await r.save();
            await this.refresh();
          }
        }
      }
    });
  }

  async driverFeedback(cur: Ride) {
    await this.dialog.error(cur.dFeedback.value);
  }

  async approve(r: Ride) {
    r.isPatientApprovedBeing.value = true;
    await r.save();

    let pName = await (await this.context.for(Patient).findId(r.pid)).name.value;
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
    await this.context.openDialog(RideCrudComponent, dlg => dlg.args = {
      rid: r.id.value,
    });
  }

  async openPatient(r: Ride) {
    await this.context.openDialog(PatientCrudComponent, dlg => dlg.args = {
      pid: r.pid.value,
    });
  }

  async openContacts(r: Ride) {

    this.context.openDialog(PatientContactsComponent, sr => sr.args = {
      pid: r.pid.value,
    });
  }

}
