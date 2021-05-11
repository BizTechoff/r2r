import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings } from '@remult/core';
import { Patient } from '../patient';
import { MatDialogRef } from '@angular/material/dialog';
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
    isNew: boolean,
  } = { pid: '', isNew: true };
  patient = this.context.for(Patient).create();
  areaSettings:DataAreaSettings=new DataAreaSettings({});
  contactsCount = 0;

  constructor(private context: Context, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    this.args.isNew = (!(this.args.pid.length > 0));
    if (!(this.args.isNew)) {
      let res = await this.retrieve(this.args.pid);
      this.patient = res.p;
      this.contactsCount = res.c;
    }
    
  this.areaSettings = new DataAreaSettings({  columnSettings: () => [
      [this.patient.name, this.patient.hebName],
      [this.patient.mobile, this.patient.idNumber],
      [this.patient.defaultBorder, this.patient.defaultHospital],
    ],});
  
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
    this.select();
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
