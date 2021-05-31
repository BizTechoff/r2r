import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { Roles } from '../../../users/roles';
import { Contact } from './contact';

@Component({
  selector: 'app-patient-contacts',
  templateUrl: './patient-contacts.component.html',
  styleUrls: ['./patient-contacts.component.scss']
})
export class PatientContactsComponent implements OnInit {

  args: {
    pid: string,
  };

  contactsSettings = this.context.for(Contact).gridSettings({
    where: c => c.patientId.isEqualTo(this.args.pid),
    orderBy: c => c.name,
    newRow: c => c.patientId.value = this.args.pid,
    allowCRUD: this.context.isAllowed([Roles.admin, Roles.usher, Roles.matcher]),
    showPagination: false,
    columnSettings: (c) => [
      c.mobile,
      c.name,
    ],
    gridButtons: [{name: 'Add Contact', click: () => {this.contactsSettings.addNewRow();}}],
    validation: c => {
      if((!c.mobile.value)){
        c.mobile.validationError = ' Required';
        throw c.mobile.defs.caption + c.mobile.validationError;
      }
      if(c.mobile.value.length < 10){
        c.mobile.validationError = ' Invalid Format (10 digits)';
        throw c.mobile.defs.caption + c.mobile.validationError;
      }
      if(!(c.mobile.value.startsWith('05'))){
        c.mobile.validationError = ' Invalid Format (start 05..)';
        throw c.mobile.defs.caption + c.mobile.validationError;
      }
    },
    confirmDelete: async (c) => await this.dialog.confirmDelete(c.mobile.value + ' ' + c.name.value)
  });

  constructor(private context: Context, private dialog: DialogService) { }

  ngOnInit() {
  }

  async retrieve() {
    await this.contactsSettings.reloadData();
  }

}
