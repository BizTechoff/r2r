import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { BoolColumn, Context, DateColumn, NumberColumn, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { Roles } from '../../../users/roles';
import { Ride, RideStatusColumn } from '../../rides/ride';
import { RideCrudComponent } from '../../rides/ride-crud/ride-crud.component';
import { addDays } from '../../usher/usher';
import { Patient, PatientIdColumn } from './../patient';
import { PatientContactsComponent } from './../patient-contacts/patient-contacts.component';
import { PatientCrudComponent } from './../patient-crud/patient-crud.component';

export class patientRides {
  id = new StringColumn();
  date = new DateColumn();
  fid = new StringColumn();
  tid = new StringColumn();
  pass = new NumberColumn();
  phones = new StringColumn();
  status = new RideStatusColumn();
  statusDate = new DateColumn();
  isWaitingForUsherApproove = new BoolColumn();
  isWaitingForStart = new BoolColumn();
  isWaitingForPickup = new BoolColumn();
  isWaitingForArrived = new BoolColumn();
}; 

@ServerController({ key: 'p', allowed: [Roles.matcher, Roles.usher, Roles.admin] })
class patientService {

  pid = new PatientIdColumn(this.context);
  constructor(private context: Context) { }

  @ServerMethod()
  async rides(): Promise<patientRides[]> {
    var result: patientRides[] = [];

    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.patientId.isEqualTo(this.pid)
    })) {
      let row: patientRides = new patientRides();
      row.date.value = r.date.value;
      row.fid.value = r.fid.value;
      row.tid.value = r.tid.value;
      result.push(row);
    }

    console.log('patientRidesRequest.result.length=' + result.length);
    return result;
  }
}

@Component({
  selector: 'app-patients-list',
  templateUrl: './patients-list.component.html',
  styleUrls: ['./patients-list.component.scss']
})
export class PatientsListComponent implements OnInit {

  search = new StringColumn({
    caption: 'search patient name',
    valueChange: () => this.busy.donotWait(async () => this.retrievePatients())

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
      // p.hebName,
      p.mobile,
      // p.idNumber,
      // p.defaultBorder,
      // p.defaultHospital,
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
    },],
  });

  constructor(private context: Context, private busy: BusyService, private dialog: DialogService) {
  }

  ngOnInit() {
    console.log("ngOnInit");
    this.retrievePatients();
  }

  async retrievePatients() {
    this.patientsSettings.reloadData();

    // this.patients = await this.context.for(Patient).find({
    //   where:p=>this.search.value?p.name.isContains(this.search):undefined
    // });
  }

  async addPatient() {
    let pid = await this.context.openDialog(PatientCrudComponent,
      cur => cur.args = { pid: '' },// input params
      cur => cur.args.pid);// output param

    if (pid && pid.length > 0) {
      let p = await this.context.for(Patient).findId(pid);
      if (p) {
        let yes = await this.dialog.yesNoQuestion(`Would You like to create Ride for ${p.name.value}`);
        if (yes) {
          await this.openAddRideDialog(p)
        }
      }
    }
    // let changed = await openPatient('', this.context);
    // var patient = this.context.for(Patient).create();
    // this.context.openDialog(
    //   InputAreaComponent,
    //   x => x.args = {
    //     title: "Add New Patient",
    //     columnSettings: () => [
    //       [patient.name, patient.hebName],
    //       [patient.mobile, patient.idNumber],
    //       [patient.defaultBorder, patient.defaultHospital],
    //     ],
    //     ok: async () => {
    //       //PromiseThrottle
    //       // ride.driverId.value = undefined;
    //       await patient.save();
    //       // this.patientsSettings.items.push(patient);
    //       this.retrievePatients();
    //     }
    //   },
    // )
  }

  async editPatient(p: Patient) {
    if (await this.context.openDialog(PatientCrudComponent, thus => thus.args = {
      pid: p.id.value
    })) {
      await p.reload();
    }
    // let changed = await openPatient(p.id.value, this.context);
  }

  async editRide(r: Ride) {
    await this.context.openDialog(RideCrudComponent, thus => thus.args = {
      rid: r.id.value
    });
  }

  async openScheduleRides(p: Patient) {


    let params = new patientService(this.context);

    // let grid:GridSettings;
    // let mem = new InMemoryDataProvider();

    params.pid.value = p.id.value;
    let rides2 = await params.rides();
    console.log('rides2.length=' + rides2.length);

    // let rides = await Usher.getRegisteredRidesForPatient(p.id.value);

    let today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());//dd/mm/yyyy 00:00:00.0

    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `${p.name.value} Rides`,
      settings: this.context.for(Ride).gridSettings({
        where: r => r.patientId.isEqualTo(p.id),
        orderBy: r => [{ column: r.date, descending: true }],
        allowCRUD: false,
        allowDelete: false,
        // showPagination: false,
        numOfColumnsInGrid: 10,
        columnSettings: r => [
          r.fid,
          r.tid,
          r.date,
          // r.patientId,
          r.status,
          // r.driverId,//??
        ],
        rowButtons: [
          {
            textInMenu: 'Edit',
            icon: 'edit',
            click: async (r) => { await this.editRide(r); },
            visible: this.context.isAllowed([Roles.matcher]),//[Roles.admin, Roles.usher, Roles.matcher]),
          },
        ],
      }),
    });
  }

  async openAddRideDialog(p: Patient) {
    if (!(p)) return;
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    let tomorrow10am = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10);

    var ride = this.context.for(Ride).create();
    ride.date.value = tomorrow;
    // ride.visitTime.value = tomorrow10am;
    ride.patientId.value = p.id.value;
    ride.fid.value = p.defaultBorder.value;
    ride.tid.value = p.defaultHospital.value;
    ride.pMobile.value = p.mobile.value;
    ride.escortsCount.value = p.age.value > 0 && p.age.value <= 13 ? 1/*kid(as patient)+adult(atleast one)*/ : 0;
    ride.isHasBabyChair.value = p.age.value > 0 && p.age.value <= 5;
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: `Add Ride For: ${p.name.value} (age: ${p.age.value})`,
        columnSettings: () => [
          ride.fid,
          ride.tid,
          [ride.date, ride.visitTime],
          [ride.escortsCount, ride.pMobile],
          [p.birthDate, p.age],
          [ride.isHasBabyChair, ride.isHasWheelchair],
          ride.rRemark,
          ride.dRemark,
        ],
        buttons: [{
          text: 'Patient Contacts',
          click: async () => {
            await this.context.openDialog(PatientContactsComponent, sr => sr.args = {
              pid: p.id.value,
            });
          }
        }
        ],
        validate: async () => {
          if (!(ride.fid.value && ride.fid.value.length > 0)) {
            ride.fid.validationError = 'Required';
            throw ride.fid.defs.caption + ' ' + ride.fid.validationError;
          }
          if (!(ride.tid.value && ride.tid.value.length > 0)) {
            ride.tid.validationError = 'Required';
            throw ride.tid.defs.caption + ' ' + ride.tid.validationError;
          }
          if (!(ride.isHasDate())) {
            ride.date.validationError = 'Required';
            throw ride.date.defs.caption + ' ' + ride.date.validationError;
          }
          if (ride.date.value < addDays(0)) {
            ride.date.validationError = 'Must be greater or equals today';
            throw ride.date.defs.caption + ' ' + ride.date.validationError;
          }
          if (ride.date.value.getFullYear() < 2000 || ride.date.value.getFullYear() > 3000) {
            ride.date.validationError = ' Invalid Format';
            throw ride.date.defs.caption + ' ' + ride.date.validationError;
          }
          if (!(ride.isHasVisitTime())) {
            ride.visitTime.validationError = 'Required';
            throw ride.visitTime.defs.caption + ' ' + ride.visitTime.validationError;
          }
        },
        ok: async () => {
          if (p.birthDate.wasChanged()) {
            await p.save();
          }
          if (!(p.mobile.value)) {
            p.mobile.value = ride.pMobile.value;
          }
          await ride.save();
          if (!(p.mobile.value)) {
            p.mobile.value = ride.pMobile.value;
            await p.save();
          }
        }
      },
    )
  }

}
