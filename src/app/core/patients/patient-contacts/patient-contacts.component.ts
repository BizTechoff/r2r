import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { Roles } from '../../../users/roles';
import { Contact } from './contact';

@Component({
  selector: 'app-patient-contacts',
  templateUrl: './patient-contacts.component.html',
  styleUrls: ['./patient-contacts.component.scss']
})
export class PatientContactsComponent implements OnInit {

  args:{
    pid: string,
  };

  contactsSettings = this.context.for(Contact).gridSettings({
    where: c => c.patientId.isEqualTo(this.args.pid),
    orderBy: c=> c.name,
    
    allowCRUD:  this.context.isAllowed(Roles.matcher),
  });

  constructor(private context:Context) { }

  ngOnInit() {
  }

  async retrieve(){
    await this.contactsSettings.reloadData();
  }

}
