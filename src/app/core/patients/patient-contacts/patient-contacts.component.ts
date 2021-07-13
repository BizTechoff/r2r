import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { Context } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { Roles } from '../../../users/roles';
import { Contact } from '../contact';
import { Patient } from '../patient';

@Component({
  selector: 'app-patient-contacts',
  templateUrl: './patient-contacts.component.html',
  styleUrls: ['./patient-contacts.component.scss']
})
export class PatientContactsComponent implements OnInit {

  _args: {
    in: { pid: string },
    out?: { mobile: string, changed?: boolean }
  } = {
      in: { pid: '' },
      out: { mobile: '', changed: false }
    };
  args: {
    pid: string,//Input the patient-id
    mobile?: string, //Output the return contact-mobile as selected row
    changed?: boolean,
    title?: string
  };

  contactsSettings = this.context.for(Contact).gridSettings({
    where: c => c.pid.isEqualTo(this.args.pid),
    orderBy: c => c.name,
    newRow: c => c.pid.value = this.args.pid,
    allowCRUD: this.context.isAllowed([Roles.admin, Roles.usher, Roles.matcher]),
    showPagination: false,
    columnSettings: (c) => [
      c.mobile,//, visible: (cur) => { return cur.mobile.value && cur.mobile.value.length > 0 }
      c.name,
      c.relation
    ],
    rowButtons: [
      { textInMenu: 'Select Mobile', icon: 'phone_callback', click: (cur) => { this.selectMobileAndClose(cur); }, visible: () => !this.context.isAllowed(Roles.driver) || this.context.isAllowed([Roles.admin, Roles.usher, Roles.matcher]) },
      { textInMenu: 'Call', icon: 'phone', click: (cur) => { window.open(`tel:${cur.mobile.value}`); }, visible: (cur) => cur.mobile.value && cur.mobile.value.length > 0 }
    ],
    gridButtons: [{ name: 'Add Contact', click: () => { this.contactsSettings.addNewRow(); } }],
    validation: c => {
      if ((!c.mobile.value)) {
        c.mobile.validationError = ' Required';
        throw c.mobile.defs.caption + c.mobile.validationError;
      }
      if (c.mobile.value.length < 10) {
        c.mobile.validationError = ' Invalid Format (10 digits)';
        throw c.mobile.defs.caption + c.mobile.validationError;
      }
      if (!(c.mobile.value.startsWith('05'))) {
        c.mobile.validationError = ' Invalid Format (start 05..)';
        throw c.mobile.defs.caption + c.mobile.validationError;
      }
    },
    confirmDelete: async (c) => await this.dialog.confirmDelete(c.mobile.value + ' ' + c.name.value)
  });

  constructor(private context: Context, private dialog: DialogService, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    if (!this.args) {
      this.args = { pid: '' };
    }
    if (this.args.pid && this.args.pid.length > 0) {
      if (!this.args.title) {
        let name = (await this.context.for(Patient).findId(this.args.pid)).name.value;
        this.args.title = `Contacts of ${name}`;
      }
    }
  }

  async retrieve() {
    await this.contactsSettings.reloadData();
  }

  async selectMobileAndClose(c: Contact) {
    this.args.mobile = c.mobile.value;
    this.args.changed = true;
    this.dialogRef.close();
  }

  async close() {
    for (const contact of this.contactsSettings.items) {
      if (contact.mobile.value && contact.mobile.value.length > 0) {
        await contact.save();
      }
    }
    this.dialogRef.close();
    // if (this.contactsSettings.items.find(cur => cur.wasChanged())) {
    //   if (await this.dialog.yesNoQuestion('Save Before Exit?')) {
    //     for (const contact of this.contactsSettings.items) {
    //       await contact.save();
    //     }
    //     this.dialogRef.close();
    //   }
    // }
  }

}
