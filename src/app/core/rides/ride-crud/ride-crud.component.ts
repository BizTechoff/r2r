import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DataAreaSettings, NumberColumn } from '@remult/core';
import { Roles } from '../../../users/roles';
import { Patient } from '../../patients/patient';
import { Ride } from '../ride';

@Component({
  selector: 'app-ride-crud',
  templateUrl: './ride-crud.component.html',
  styleUrls: ['./ride-crud.component.scss']
})
export class RideCrudComponent implements OnInit {

  okPressed = false;
  args: { rid: string } = { rid: '' };
  r = this.context.for(Ride).create();
  age = new NumberColumn({ caption: 'Age' });
  lock = false;
  dataArea:DataAreaSettings;
  //   columnSettings: () => [
  //     { column: r.fid, readonly: lock },
  //     // [{ column: new StringColumn(), clickIcon: 'vertical_align_center', click: () => this.swapLocations(r), width: '10' }, {column: new StringColumn({defaultValue: '                                                '})}],
  //     { column: r.tid, readonly: lock },
  //     r.immediate,
  //     [
  //       { column: r.date, visible: () => { return !r.immediate.value; } },
  //       { column: r.visitTime, visible: () => { return !r.immediate.value; } }
  //     ],
  //     [
  //       { column: r.escortsCount },
  //       { column: age, readOnly: true, getValue: () => { return this.context.for(Patient).lookup(r.patientId).age.value; } },
  //     ],
  //     [
  //       r.isHasBabyChair,
  //       r.isHasWheelchair
  //     ],
  //     r.rRemark,
  //     // r.dRemark,
  //   ],
  //   validate: async () => {
  //     if (!(r.fid.value && r.fid.value.length > 0)) {
  //       r.fid.validationError = 'Required';
  //       throw r.fid.defs.caption + ' ' + r.fid.validationError;
  //     }
  //     if (!(r.tid.value && r.tid.value.length > 0)) {
  //       r.tid.validationError = 'Required';
  //       throw r.tid.defs.caption + ' ' + r.tid.validationError;
  //     }
  //     if (!(r.isHasDate())) {
  //       r.date.validationError = 'Required';
  //       throw r.date.defs.caption + ' ' + r.date.validationError;
  //     }
  //     if (r.date.value < addDays(0)) {
  //       r.date.validationError = 'Must be greater or equals today';
  //       throw r.date.defs.caption + ' ' + r.date.validationError;
  //     }
  //     if (!(r.isHasVisitTime())) {
  //       r.visitTime.validationError = 'Required';
  //       throw r.visitTime.defs.caption + ' ' + r.visitTime.validationError;
  //     }
  //   },
  //   buttons: [
  //     {
  //       text: 'Contacts',
  //       click: async () => await this.openContacts(r)
  //     },
  //     {
  //       text: 'Swap Locations',
  //       click: async () => await this.swapLocations(r)
  //     }
  //   ],
  //   ok: async () => {
  //     await r.save();
  //   }
  // },

  constructor(private context: Context, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {

    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    let tomorrow10am = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10);

    this.r.date.value = tomorrow;

    if (this.args.rid && this.args.rid.length > 0) {
      console.log('this.args.rid='+this.args.rid);
      this.r = await this.context.for(Ride).findId(this.args.rid);
    }

    this.dataArea = new DataAreaSettings({
      columnSettings: () => [
        { column: this.r.fid, readonly: this.lock },
        { column: this.r.tid, readonly: this.lock },
        this.r.immediate,
        [
          { column: this.r.date, visible: () => { return !this.r.immediate.value; } },
          { column: this.r.visitTime, visible: () => { return !this.r.immediate.value; } }
        ],
        [
          { column: this.r.escortsCount },
          { column: this.age, readOnly: true, getValue: () => { return this.context.for(Patient).lookup(this.r.patientId).age.value; } },
        ],
        [
          this.r.isHasBabyChair,
          this.r.isHasWheelchair
        ],
        this.r.rRemark,
        { column: this.r.dRemark }// visible: this.context.isAllowed([Roles.admin, Roles.usher, Roles.driver]) },
      ],
    });
  }

  async save() {
    // ok: async () => { if (ride.wasChanged()) { await ride.save(); changed = true; } }
    await this.r.save();
    this.args.rid = this.r.id.value;
    this.select();
  }

  close() {
    this.dialogRef.close();
  }
  select() {
    this.dialogRef.close();
    this.okPressed = true;
  }

}
