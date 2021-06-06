import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DataAreaSettings, NumberColumn } from '@remult/core';
import { SendSmsComponent } from '../../services/send-sms/send-sms.component';
import { Patient } from '../patient';
import { Contact } from '../patient-contacts/contact';
import { PatientContactsComponent } from '../patient-contacts/patient-contacts.component';

@Component({
  selector: 'app-patient-crud',
  templateUrl: './patient-crud.component.html',
  styleUrls: ['./patient-crud.component.scss']
})
export class PatientCrudComponent implements OnInit {

  okPressed = false;
  args: {
    pid: string,
  } = { pid: '' };
  patient = this.context.for(Patient).create();
  areaSettings: DataAreaSettings = new DataAreaSettings({});
  contactsCount = 0;


  constructor(private context: Context, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    if (!(this.args.pid)) {
      this.args.pid = '';
    }
    let isNew = (!(this.args.pid.length > 0));
    if (!(isNew)) {
      let res = await this.retrieve(this.args.pid);
      this.patient = res.p;
      this.contactsCount = res.c;
    }

    this.areaSettings = new DataAreaSettings({
      columnSettings: () => [
        [this.patient.name, this.patient.hebName],
        [this.patient.mobile, this.patient.idNumber],
        [{ column: this.patient.birthDate }, { column: this.patient.age, readOnly: true, width: '25px' }],
        [this.patient.defaultBorder, this.patient.defaultHospital],
        this.patient.remark,
      ],
    });

  }

  async retrieve(pid: string) {
    let p = await this.context.for(Patient).findId(
      pid);
    let c = await this.context.for(Contact).count(
      c => c.patientId.isEqualTo(pid),
    );

    return { p: p, c: c };
  }

  async save() {
    await this.patient.save();
    this.args.pid = this.patient.id.value;
    this.select();
  }

  async sendMessage() {
    let message = 'תואמה לך נסיעה מחר ממחסום, בית חולים שעה וכו...';
    console.log(`Send message to patient: ${message}`);

    await this.context.openDialog(SendSmsComponent, sms => sms.args = {
      mobile: '0526526063',
      message: 'Sms Works!'
    });
  }
 
  async contacts() {

    await this.context.openDialog(PatientContactsComponent, sr => sr.args = {
      pid: this.patient.id.value,
    });
  }

  close() {
    this.dialogRef.close();
  }
  select() {
    this.dialogRef.close();
    this.okPressed = true;
  }

}
