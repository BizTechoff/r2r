import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DataAreaSettings } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { TODAY } from '../../../shared/types';
import { addDays, fixMobile } from '../../../shared/utils';
import { SendSmsComponent } from '../../services/send-sms/send-sms.component';
import { Contact } from '../contact';
import { Patient } from '../patient';
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
  p = this.context.for(Patient).create();
  areaSettings: DataAreaSettings = new DataAreaSettings({});
  contactsCount = 0;


  constructor(private context: Context, private dialog: DialogService, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    if (!(this.args.pid)) {
      this.args.pid = '';
    }
    let isNew = (!(this.args.pid.length > 0));
    if (!(isNew)) {
      let res = await this.retrieve(this.args.pid);
      this.p = res.p;
      if (this.p.mobile.value) {
        this.p.mobile.value = fixMobile(this.p.mobile.value);
      }
      this.contactsCount = res.c;
    }

    this.areaSettings = new DataAreaSettings({
      columnSettings: () => [
        [this.p.name],// this.patient.hebName],
        [this.p.mobile, this.p.idNumber],
        [{ column: this.p.birthDate }, { column: this.p.age, readOnly: true, width: '25' }],
        [this.p.defaultBorder, this.p.defaultHospital],
        [this.p.isHasBabyChair, this.p.isHasWheelchair],
        this.p.remark
      ],
    });

  }

  async retrieve(pid: string) {
    let p = await this.context.for(Patient).findId(
      pid);
    let c = await this.context.for(Contact).count(
      c => c.pid.isEqualTo(pid),
    );

    return { p: p, c: c };
  }

  async save() {
    if (await this.validate()) {
      await this.p.save();
      this.args.pid = this.p.id.value;
      this.select();
    }
  }

  async validate(): Promise<boolean> {
    if (!this.p.name.value) {
      this.p.name.validationError = `Required`;
      await this.dialog.error(`${this.p.name.defs.caption}: ${this.p.name.validationError}`);
      return false;
    }
    this.p.name.value = this.p.name.value.trim();
    if (this.p.name.value.length < 2) {
      this.p.name.validationError = `at least 2 letters`;
      await this.dialog.error(`${this.p.name.defs.caption}: ${this.p.name.validationError}`);
      return false;
    }
    if (!this.p.mobile.value) {
      this.p.mobile.validationError = `Required`;
      await this.dialog.error(`${this.p.mobile.defs.caption}: ${this.p.mobile.validationError}`);
      return false;
    }
    this.p.mobile.value = this.p.mobile.value.trim();
    let mobile = this.p.mobile.value;
    mobile = mobile.replace('-', '').replace('-', '').replace('-', '').replace('-', '');
    if (mobile.length != 10) {
      this.p.mobile.validationError = `should be 10 digits`;
      await this.dialog.error(`${this.p.mobile.defs.caption}: ${this.p.mobile.validationError} : ${mobile}`);
      return false;
    }
    if (mobile.slice(0, 2) != '05') {
      this.p.mobile.validationError = `must start with '05'`;
      await this.dialog.error(`${this.p.mobile.defs.caption}: ${this.p.mobile.validationError}`);
      return false;
    }
    for (const c of mobile) {
      if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(c)) {
        this.p.mobile.validationError = `should be ONLY digits`;
        await this.dialog.error(`${this.p.mobile.defs.caption}: ${this.p.mobile.validationError}`);
        return false;
      }
    }

    if (!this.p.idNumber.value) {
      this.p.idNumber.validationError = `Required`;
      await this.dialog.error(`${this.p.idNumber.defs.caption}: ${this.p.idNumber.validationError}`);
      return false;
    }
    this.p.idNumber.value = this.p.idNumber.value.trim();
    if (this.p.idNumber.value.length < 9) {
      this.p.idNumber.validationError = `at least 9 digits`;
      await this.dialog.error(`${this.p.idNumber.defs.caption}: ${this.p.idNumber.validationError}`);
      return false;
    }

    if (!this.p.birthDate || !this.p.birthDate.value) {
      this.p.birthDate.validationError = 'Required';
      await this.dialog.error(`${this.p.birthDate.defs.caption}: ${this.p.birthDate.validationError}`);
      return false;
    }
    if (!(this.p.birthDate.value.getFullYear() > 1900 && this.p.birthDate.value.getFullYear() <= addDays(TODAY).getFullYear())) {
      this.p.birthDate.validationError = 'Not Valid';
      await this.dialog.error(`${this.p.birthDate.defs.caption}: ${this.p.birthDate.validationError}`);
      return false;
    }
    this.p.mobile.value = mobile;

    return true;
  }

  async sendMessage() {
    let message = 'תואמה לך נסיעה מחר ממחסום, בית חולים שעה וכו...';
    console.log(`Send message to patient: ${message}`);

    await this.context.openDialog(SendSmsComponent, sms => sms.args = {
      mobile: '0526526063',
      message: message
    });
  }

  async contacts() {
    if (this.p.isNew() || this.p.wasChanged()) {
      await this.p.save();
    }
    let changed = await this.context.openDialog(PatientContactsComponent,
      sr => sr.args = { pid: this.p.id.value, changed: true },
      sr => sr ? sr.args.changed : false);

    if (changed) {
      this.contactsCount = await this.context.for(Contact).count(
        c => c.pid.isEqualTo(this.p.id),
      );
    }
  }

  close() {
    this.dialogRef.close();
  }
  select() {
    this.dialogRef.close();
    this.okPressed = true;
  }

}
