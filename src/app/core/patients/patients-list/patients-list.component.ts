import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { Roles } from '../../../users/roles';
import { Ride } from '../../rides/ride';
import { RideCrudComponent } from '../../rides/ride-crud/ride-crud.component';
import { Patient } from './../patient';
import { PatientCrudComponent } from './../patient-crud/patient-crud.component';

@Component({
  selector: 'app-patients-list',
  templateUrl: './patients-list.component.html',
  styleUrls: ['./patients-list.component.scss']
})
export class PatientsListComponent implements OnInit {

  search = new StringColumn({
    dataControlSettings: () => ({ clickIcon: 'search', click: async () => await this.retrievePatients() }),
    caption: 'Search here for patient name',
    valueChange: () => this.busy.donotWait(async () => await this.retrievePatients())
  });
  // patients: Patient[];
  patientsSettings = this.context.for(Patient).gridSettings({
    where: p => this.search.value ? p.name.isContains(this.search) : undefined,
    caption: "Patients",
    confirmDelete: (p) => this.dialog.confirmDelete(p.name.value),
    allowCRUD: false,
    numOfColumnsInGrid: 10,
    columnSettings: p => [
      p.name,
      {column: p.mobile, width: '110'},
      {column: p.age, width: '65'}
    ],
    gridButtons: [{
      name: 'Add New Patient',
      icon: 'add',
      // cssClass: 'color="primary"',
      click: async () => {
        await this.addPatient();
      }
    }],
    rowButtons: [{
      textInMenu: "Add Ride",
      click: async (p) => await this.openAddRideDialog(p),
      icon: "directions_bus_filled",
      visible: (d) => !d.isNew(),
      showInLine: true,
    }, {
      textInMenu: "Show Rides",
      click: async (p) => await this.openScheduleRides(p),
      icon: "departure_board",
      visible: (d) => !d.isNew(),
      showInLine: true,
    }, {
      textInMenu: "______________________",//seperator
    }, {
      textInMenu: "Edit Patient",
      icon: "edit",
      visible: (p) => !p.isNew(),
      click: async (p) => {
        await this.editPatient(p);
      },
    }, {
      textInMenu: "Delete Patient",
      icon: "delete",
      visible: (p) => !p.isNew(),
      click: async (p) => {
        let name = (await this.context.for(Patient).findId(p.id.value)).name.value;
        if (await this.dialog.confirmDelete(name)) {
          await p.delete();
        }
      },
    }],
  });

  constructor(private context: Context, private busy: BusyService, private dialog: DialogService) {
  }

  ngOnInit() {
    // console.log("ngOnInit");
    this.retrievePatients();
  }

  async retrievePatients() {
    this.patientsSettings.reloadData();
  }

  async addPatient() {
    let pid = await this.context.openDialog(PatientCrudComponent,
      cur => cur.args = { pid: '' },// input params
      cur => { if (cur && cur.args) return cur.args.pid; });// output param

    if (pid && pid.length > 0) {
      let p = await this.context.for(Patient).findId(pid);
      if (p) {
        let yes = await this.dialog.yesNoQuestion(`Would You like to create Ride for ${p.name.value}`);
        if (yes) {
          await this.openAddRideDialog(p)
        }
      }
      await this.retrievePatients();
    }
  }

  async editPatient(p: Patient) {
    if (await this.context.openDialog(PatientCrudComponent, dlg => dlg.args = {
      pid: p.id.value
    })) {
      await p.reload();
    }
    // let changed = await openPatient(p.id.value, this.context);
  }

  async editRide(r: Ride) {
    await this.context.openDialog(RideCrudComponent, dlg => dlg.args = {
      rid: r.id.value
    });
  }

  async openScheduleRides(p: Patient) {
    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `${p.name.value} Rides`,
      settings: this.context.for(Ride).gridSettings({
        where: r => r.pid.isEqualTo(p.id),
        orderBy: r => [{ column: r.date, descending: true }, { column: r.visitTime, descending: true }],
        allowCRUD: false,
        allowDelete: false,
        // showPagination: false,
        numOfColumnsInGrid: 10,
        columnSettings: r => [
          r.fid,
          r.tid,
          { column: r.date, width: '110' },
          { column: r.visitTime, width: '110' },
          r.status,
          r.statusDate,
          r.did
        ],
        rowButtons: [
          {
            textInMenu: 'Edit',
            icon: 'edit',
            click: async (r) => { await this.editRide(r); },
            visible: () => this.context.isAllowed(Roles.matcher),//[Roles.admin, Roles.usher, Roles.matcher]),
            showInLine: true
          },
        ],
      }),
    });
  }

  async openAddRideDialog(p: Patient) {

    await this.context.openDialog(RideCrudComponent, dlg => dlg.args = {
      pid: p.id.value
    });
  }

}
