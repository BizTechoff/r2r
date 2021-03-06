import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BoolColumn, Context, DataAreaSettings } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { TimeColumn, TODAY } from '../../../shared/types';
import { addDays, getDateWithNoTimezoneOffset } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { LocationType } from '../../locations/location';
import { Contact } from '../../patients/contact';
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
  createBackRide = new BoolColumn({ caption: 'Need Back Ride?', defaultValue: true });

  constructor(private context: Context, private dialog: DialogService, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    if (this.args.rid && this.args.rid.length > 0) {
      this.r = await this.context.for(Ride).findId(this.args.rid);
      if (this.r) {
        this.args.pid = this.r.pid.value;
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
          // this.r.visitTime.value = tomorrow10am;
          this.r.isBackRide.value = false;
          this.r.pid.value = this.p.id.value;
          this.r.fid.value = this.p.defaultBorder.value;
          this.r.tid.value = this.p.defaultHospital.value;
          this.r.pMobile.value = this.p.mobile.value;
          this.r.escortsCount.value = 1;// this.p.age.value > 0 && this.p.age.value <= 13 ? 1/*kid(as patient)+adult(atleast one)*/ : 0;
          // this.r.isHasBabyChair.value = this.p.age.value > 0 && this.p.age.value <= 5;
        }
      }
      else {
        await this.dialog.error("Ride NOT Found !")
        this.close();
        return;
      }
    }
    else {
      await this.dialog.error("Ride NOT Found !")
      this.close();
      return;
    }

    let rOnly = RideStatus.isRideReadOnly.includes(this.r.status.value);
    let hasBackRide = this.r.hadBackRide();
    this.dataArea = new DataAreaSettings<Ride>({

      columnSettings: () => [
        {
          column: this.r.fid, readonly: () => { return rOnly; },
          caption: 'From ' + (this.r.fid && this.r.fid.selected ? this.r.fid.selected.type.value === LocationType.border ? 'Border' : 'Hospital' : 'Location')
        },
        {
          column: this.r.tid, readonly: () => { return rOnly; },
          caption: 'To ' + (this.r.tid && this.r.tid.selected ? this.r.tid.selected.type.value === LocationType.border ? 'Border' : 'Hospital' : 'Location')
        },
        [
          {
            column: this.r.immediate,
            visible: () => this.setImmediateVisible(),
            readOnly: () => { return rOnly; }
          },
          {
            column: this.createBackRide,
            visible: () => this.setBackRideVisible(),
            readOnly: () => { return rOnly; },
            cssClass: 'boldFont'
          }
        ],
        [
          { column: this.r.date, readOnly: () => { return rOnly; }, visible: () => { return !this.r.immediate.value; } },
          // { column: this.r.visitTime, visible: () => { return !this.r.immediate.value; } }



          {
            column: this.r.visitTime,
            visible: () => {
              let v = this.r.fid.selected && this.r.fid.selected.type.value === LocationType.border && !this.r.immediate.value;
              return v;
            }
          },
          {
            column: this.r.pickupTime,
            visible: () => {
              let v = this.r.fid.selected && this.r.fid.selected.type.value === LocationType.hospital && !this.r.immediate.value;
              return v;
            }
          }

        ],
        [
          { column: this.r.escortsCount },
          this.r.pMobile
        ],
        [
          this.p.birthDate,
          { column: this.p.age, readOnly: () => { return true; } }
        ],
        // [
        //   this.r.isHasBabyChair,
        //   this.r.isHasWheelchair
        // ],
        { column: this.p.remark, readOnly: () => { return true; } },
        this.r.rRemark,
        { column: this.r.dRemark, visible: () => !this.context.isAllowed(Roles.matcher) }
      ],
    });
  }

  setBackRideVisible() {
    let result = true;
    let selected = false;
    if (this.r.fid.selected && this.r.fid.selected.id.value) {
      selected = true;
    }
    // else {
    //   if (this.r.fid.value && this.r.fid.value.length > 0) {
    //     this.r.fid.selected = await this.context.for(Location).findId(this.r.fid.value);
    //     if (this.r.fid.selected) {
    //       selected = true;
    //     }
    //   }
    // }
    if (selected) {
      if (![LocationType.border].includes(this.r.fid.selected.type.value)) {
        result = false;
      }
    }
    result = selected && result && this.r.isNew();
    if (!(result)) {
      this.createBackRide.value = false;
    }
    else if (this.r.isNew()) {
      this.createBackRide.value = true;
    }
    return result;
  }

  setImmediateVisible() {
    let result = true;
    let selected = false;
    if (this.r.fid.selected && this.r.fid.selected.id.value) {
      selected = true;
    }
    // else {
    //   if (this.r.fid.value && this.r.fid.value.length > 0) {
    //     this.r.fid.selected = await this.context.for(Location).findId(this.r.fid.value);
    //     if (this.r.fid.selected) {
    //       selected = true;
    //     }
    //   }
    // }
    if (selected) {
      if (![LocationType.hospital].includes(this.r.fid.selected.type.value)) {
        result = false;
      }
    }
    result = selected && result;
    if (!(result)) {
      this.r.immediate.value = false;
    }
    return result;
  }

  disabledSave() {
    // if (this.r && this.r.status) {
    //   return RideStatus.isRideReadOnly.includes(this.r.status.value);
    // }
    return false;
  }

  async save(close = true): Promise<boolean> {
    let result = false;
    if (!(this.disabledSave())) {
      if (await this.validate()) {// ok: async () => { if (ride.wasChanged()) { await ride.save(); changed = true; } }
        if (this.p) {
          if (this.r.pMobile.value !== this.p.mobile.value && this.r.pMobile.wasChanged()) {
            let contact = await this.context.for(Contact).findOrCreate({
              where: cur => cur.pid.isEqualTo(this.p.id)
                .and(cur.mobile.isEqualTo(this.r.pMobile))
            })
            if (contact.isNew()) {
              await contact.save();
            }
          }
          else {
            if (this.p.birthDate.wasChanged()) {
              await this.p.save();
            }
          }
        }
        if (this.r) {
          if (this.r.isNew()) {
            this.r.needBackRide.value = this.createBackRide.value;//'Need Back Ride?'
          }
          await this.r.save();
          result = true;
          this.args.rid = this.r.id.value;
        }
        if (close) {
          this.select();
        }
      }
    }
    else result = true;
    return result;
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
      this.r.date.validationError = 'Must be greater or equals today';// ' + this.r.date.value + '|' + addDays(TODAY);
      await this.dialog.error(this.r.date.defs.caption + ' ' + this.r.date.validationError);
      return false;
    }
    if (this.r.date.value.getFullYear() < 2000 || this.r.date.value.getFullYear() > 3000) {
      this.r.date.validationError = ' Invalid Date';
      await this.dialog.error(this.r.date.defs.caption + ' ' + this.r.date.validationError);
      return false;
    }

    let date = addDays();
    console.log('datedate=' + date);
    let time = formatDate(addDays(TODAY, undefined, false), 'HH:mm', 'en-US');
    let isBorder = this.r.fid.selected && this.r.fid.selected.type.value === LocationType.border ? true : false;
    let isHospital = this.r.fid.selected && this.r.fid.selected.type.value === LocationType.hospital ? true : false;
    if (!isHospital) {
      if (!(this.r.isHasVisitTime())) {
        this.r.visitTime.validationError = 'Required';
        await this.dialog.error(this.r.visitTime.defs.caption + ' ' + this.r.visitTime.validationError);
        return false;
      }
      if (date.toLocaleDateString() === this.r.date.value.toLocaleDateString()) {
        if (this.r.visitTime.value < time) {
          this.r.visitTime.validationError = 'Should Be greater then Now';
          await this.dialog.error(this.r.visitTime.defs.caption + ' ' + this.r.visitTime.validationError);
          return false;
        }
      }
    }
    else if (!isBorder) {
      if (!(this.r.immediate.value)) {
        if (!(this.r.isHasPickupTime())) {
          this.r.pickupTime.validationError = 'Required';
          await this.dialog.error(this.r.pickupTime.defs.caption + ' ' + this.r.pickupTime.validationError);
          return false;
        }
        if (date.toLocaleDateString() === this.r.date.value.toLocaleDateString()) {
          if (this.r.pickupTime.value < time) {
            this.r.pickupTime.validationError = 'Should Be greater then Now';
            await this.dialog.error(this.r.pickupTime.defs.caption + ' ' + this.r.pickupTime.validationError);
            return false;
          }
        }
      }
    }
    else {
      console.log('NOT Hospital && NOT Border ?????')
    }

    if (!this.r.pMobile.value) {
      this.r.pMobile.validationError = `Required`;
      await this.dialog.error(`${this.r.pMobile.defs.caption}: ${this.r.pMobile.validationError}`);
      return false;
    }
    this.r.pMobile.value = this.r.pMobile.value.trim();
    let mobile = this.r.pMobile.value;
    mobile = mobile.replace('-', '').replace('-', '').replace('-', '').replace('-', '');
    if (mobile.length != 10) {
      this.r.pMobile.validationError = `should be 10 digits`;
      await this.dialog.error(`${this.r.pMobile.defs.caption}: ${this.r.pMobile.validationError} : ${mobile}`);
      return false;
    }
    if (mobile.slice(0, 2) != '05') {
      this.r.pMobile.validationError = `must start with '05'`;
      await this.dialog.error(`${this.r.pMobile.defs.caption}: ${this.r.pMobile.validationError}`);
      return false;
    }
    for (const c of mobile) {
      if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(c)) {
        this.r.pMobile.validationError = `should be ONLY digits`;
        await this.dialog.error(`${this.r.pMobile.defs.caption}: ${this.r.pMobile.validationError}`);
        return false;
      }
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
    // if(this.r.immediate.value){
    //   if(this.r.isNew()){
    //     this.r.date.value = addDays();
    //     this.r.pickupTime.value = TimeColumn.Empty;
    //   }
    // }

    return true;
  }

  async openPatientContacts() {
    if (this.r.wasChanged()) {// || isNew()
      let yes = await this.dialog.yesNoQuestion(`Ride didn't saved. Save and ${this.r.isNew() ? 'Create the ride' : 'Open Contacts'}?`);
      if (yes) {
        let ok = await this.save(false);
        if (!ok) {
          return;
        }
      }
      else {
        return;
      }
    }

    let mobile = await this.context.openDialog(PatientContactsComponent,
      dlg => dlg.args = { pid: this.args.pid },
      dlg => dlg ? dlg.args.mobile : '');

    if (mobile && mobile.length > 0) {
      this.r.pMobile.value = mobile;
    }
  }

  async swapLocations() {
    let started = RideStatus.isInDriving.includes(this.r.status.value);
    if (started) {
      this.dialog.error('Can not swap locations, ride already started');
    }
    else if (this.r.hadBackRide()) {
      await this.dialog.error('Back-Ride already created! Can not swap locations');
    }
    else {
      this.r.swapLocations();
      this.setBackRideVisible();
      this.setImmediateVisible();
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
