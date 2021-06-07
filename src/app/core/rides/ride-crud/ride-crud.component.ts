import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DataAreaSettings, NumberColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { addDays, TODAY } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { Patient } from '../../patients/patient';
import { PatientContactsComponent } from '../../patients/patient-contacts/patient-contacts.component';
import { Ride, RideStatus } from '../ride';

@Component({
  selector: 'app-ride-crud',
  templateUrl: './ride-crud.component.html',
  styleUrls: ['./ride-crud.component.scss']
})
export class RideCrudComponent implements OnInit {

  args: { rid?: string, pid?: string } = { rid: '', pid: '' };
  okPressed = false;
  dataArea: DataAreaSettings;
  r: Ride;
  p: Patient;

  constructor(private context: Context, private dialog: DialogService, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    if (this.args.rid && this.args.rid.length > 0) {
      this.r = await this.context.for(Ride).findId(this.args.rid);
      if (this.r) {
        this.args.pid = this.r.patientId.value;
      }
    }
    if (!(this.r)) {
      this.r = this.context.for(Ride).create();
      this.r.date.value = addDays(+1);
    }
    if (this.args.pid && this.args.pid.length > 0) {
      this.p = await this.context.for(Patient).findId(this.args.pid);
      if (this.p) {
        if (this.r.isNew()) {
          this.r.patientId.value = this.args.pid;
          this.r.pMobile.value = this.p.mobile.value;
          // this.r.visitTime.value = tomorrow10am;
          this.r.patientId.value = this.p.id.value;
          this.r.fid.value = this.p.defaultBorder.value;
          this.r.tid.value = this.p.defaultHospital.value;
          this.r.pMobile.value = this.p.mobile.value;
          this.r.escortsCount.value = this.p.age.value > 0 && this.p.age.value <= 13 ? 1/*kid(as patient)+adult(atleast one)*/ : 0;
          this.r.isHasBabyChair.value = this.p.age.value > 0 && this.p.age.value <= 5;
        }
      }
      else {
        await this.dialog.error("RideCrudComponent(pid==null)")
        this.close();
        return;
      }
    }

    let rOnly = RideStatus.isInProgressStatuses.includes(this.r.status.value);

    this.dataArea = new DataAreaSettings({
      columnSettings: () => [
        { column: this.r.fid, readonly: rOnly },
        { column: this.r.tid, readonly: rOnly },
        { column: this.r.immediate, readOnly: rOnly },
        [
          { column: this.r.date, readOnly: rOnly, visible: () => { return !this.r.immediate.value; } },
          { column: this.r.visitTime, visible: () => { return !this.r.immediate.value; } }
        ],
        [this.r.escortsCount, this.r.pMobile],
        [this.p.birthDate, this.p.age],
        [this.r.isHasBabyChair, this.r.isHasWheelchair],
        this.r.rRemark,
        { column: this.r.dRemark, readOnly: this.context.isAllowed([Roles.matcher]) },
      ],
    });
  }

  async save() {
    if (await this.validate()) {// ok: async () => { if (ride.wasChanged()) { await ride.save(); changed = true; } }
      if (this.p) {
        if (this.p.birthDate.wasChanged() || (!(this.p.mobile.value))) {
          this.p.mobile.value = this.r.pMobile.value;
          await this.p.save();
        }
      }
      if (this.r) {
        await this.r.save();
        this.args.rid = this.r.id.value;
      }
      this.select();
    }
  }

  async validate(): Promise<boolean> {
    if (!(this.r.fid.value && this.r.fid.value.length > 0)) {
      this.r.fid.validationError = 'Required';
      await this.dialog.error(this.r.fid.defs.caption + ' ' + this.r.fid.validationError);
      return false;
    }
    if (!(this.r.tid.value && this.r.tid.value.length > 0)) {
      this.r.tid.validationError = 'Required';
      await this.dialog.error(this.r.tid.defs.caption + ' ' + this.r.tid.validationError);
      return false;
    }
    if (!(this.r.isHasDate())) {
      this.r.date.validationError = 'Required';
      await this.dialog.error(this.r.date.defs.caption + ' ' + this.r.date.validationError);
      return false;
    }
    if (this.r.date.value < addDays(TODAY)) {
      this.r.date.validationError = 'Must be greater or equals today';
      await this.dialog.error(this.r.date.defs.caption + ' ' + this.r.date.validationError);
      return false;
    }
    if (this.r.date.value.getFullYear() < 2000 || this.r.date.value.getFullYear() > 3000) {
      this.r.date.validationError = ' Invalid Format';
      await this.dialog.error(this.r.date.defs.caption + ' ' + this.r.date.validationError);
      return false;
    }
    if (!(this.r.isHasVisitTime())) {
      this.r.visitTime.validationError = 'Required';
      await this.dialog.error(this.r.visitTime.defs.caption + ' ' + this.r.visitTime.validationError);
      return false;
    }
    if (!(this.p.hasBirthDate())) {
      this.r.visitTime.validationError = 'Required';
      await this.dialog.error(this.r.visitTime.defs.caption + ' ' + this.r.visitTime.validationError);
      return false;
    }
    return true;
  }

  async openPatientContacts() {
    await this.context.openDialog(PatientContactsComponent, sr => sr.args = {
      pid: this.args.pid,
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
