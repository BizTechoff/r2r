import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DateColumn, Filter, GridSettings, NumberColumn, ServerFunction } from '@remult/core';
import { DynamicServerSideSearchDialogComponent } from '../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component';
import { getRideList4UsherParams, ride4Usher } from '../../shared/types';
import { Roles } from '../../users/roles';
import { Driver, openDriver } from '../drivers/driver';
import { Location, LocationIdColumn } from '../locations/location';
import { Patient } from '../patients/patient';
import { PatientCrudComponent } from '../patients/patient-crud/patient-crud.component';
import { addRide, openRide, Ride, RideStatus } from '../rides/ride';
import { ApproveDriverComponent } from './approve-driver/approve-driver.component';
import { MabatGroupBy } from './mabat';
import { SetDriverComponent } from './set-driver/set-driver.component';
import { ShowRidesComponent, UsherRowStatus } from './show-rides/show-rides.component';
import { Usher, UsherRideGroup, UsherRideRow } from './usher';

@Component({
  selector: 'app-usher',
  templateUrl: './usher.component.html',
  styleUrls: ['./usher.component.scss']
})
export class UsherComponent implements OnInit {

  selectedDate: DateColumn;
  selectedFrom: LocationIdColumn;
  selectedTo: LocationIdColumn;
  toolbar: DataAreaSettings;

  ridesGrid: GridSettings<Ride>;

  //for(UsherRideRow)
  //ridesGrid : DataList<Ride>{};
  rides2: UsherRideGroup;
  rides: ride4Usher[];
  clientLastRefreshDate: Date = new Date();
  demoDates: string;
  static lastRefreshDate: Date = new Date();//client time

  constructor(public context: Context) { }

  async ngOnInit() {

    let date = new Date(2021, 2, 3);
    this.selectedFrom = new LocationIdColumn({ caption: "From" }, this.context);
    this.selectedTo = new LocationIdColumn({ caption: "To" }, this.context);
    this.selectedDate = new DateColumn({ caption: "Date", defaultValue: new Date(date.getFullYear(), date.getMonth(), date.getDate()) });
    this.toolbar = new DataAreaSettings({
      columnSettings: () => [
        [this.selectedDate, this.selectedFrom, this.selectedTo]
      ],
    });
    await this.refresh();
  }

  filter(r: Ride, from: string, to: string): Filter {
    return r.date.isEqualTo(this.selectedDate)
      .and(r.status.isNotIn(...[RideStatus.succeeded]))
      .and(from && (from.trim().length > 0) ? r.fromLocation.isEqualTo(from) : new Filter(x => { }))
      .and(to && (to.trim().length > 0) ? r.toLocation.isEqualTo(to) : new Filter(x => { }));
  }

  async openBackRide(r: Ride): Promise<void> {

    this.context.openDialog(ShowRidesComponent, sr => sr.args = {
      date: this.selectedDate.value,
      from: r.fromLocation.value,
      to: r.toLocation.value,
      status: UsherRowStatus.backRide,
    });
  }

  async openApproveDriver(r: ride4Usher) {
    
    this.context.openDialog(ShowRidesComponent, sr => sr.args = {
      date: this.selectedDate.value,
      from: r.fromId,
      to: r.toId,
      status: UsherRowStatus.approve4Driver,
    });
  }



  async openShowRides(r: ride4Usher) {
    this.context.openDialog(ShowRidesComponent, sr => sr.args = {
      date: this.selectedDate.value,
      from: r.fromId,
      to: r.toId,
      status: UsherRowStatus.all,
    });

  }
 

  async openSetDriver(r: ride4Usher) {
    this.context.openDialog(SetDriverComponent, sr => sr.args = {
      date: this.selectedDate.value,
      from: r.fromId,
      to: r.toId,
    });
  }

  attachToDriver() {
  }

  async selectedFromChanged() {
    console.log(this.selectedFrom.value);
  }


  async selectedDateChanged() { 
    console.log(this.selectedDate.value); }

  items: Ride[];
  async refresh() {
    this.clientLastRefreshDate = new Date();
    UsherComponent.lastRefreshDate = new Date();
    // await this.ridesGrid.reloadData();
    let params: getRideList4UsherParams = {
      date: this.selectedDate.value,
      fromId: this.selectedFrom.value,
      toId: this.selectedTo.value,
    };

    this.rides = await Usher.getRideList4Usher(params);
  }

  async addRide() {
    let changed = await addRide('', this.context);
  }

  @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
  static async retrieveUsherRides(fromDb = true, context?: Context): Promise<UsherRideGroup> {
    let result: UsherRideGroup = { title: "Not Found Rides", rows: [], groups: [], field: MabatGroupBy.none };
    UsherComponent.lastRefreshDate = new Date();//server date
    if (fromDb) {
      result = await Usher.getRides4Usher('', context);
    }
    return result;
  }

  async assignSelected() {

  }

  async addPatient(r: UsherRideRow) { }
  async addDriver(r: UsherRideRow) { }
  async editRide(r: UsherRideRow) {
    console.log(r);
    let changed = await openRide(r.id, this.context);
    if (changed) {
      // let ride = await this.context.for(Ride).findId(r.id);
      // r.pid = ride.patientId.value;
      // // r.pAge = ride.age();
      // r.passengers = ride.passengers();
      // // r.icons = ride.patientId.value;
      // r.did = ride.driverId.value;
      // r.status = ride.status.value;
    }
  }
  async editPatient(r: UsherRideRow) {
    await this.context.openDialog(PatientCrudComponent, thus => thus.args = {
      pid: r.pid, isNew: false,
    });
    // let changed = await openPatient(r.pid, this.context);
  }
  async editDriver(r: UsherRideRow) {
    let changed = await openDriver(r.did, this.context);
  }
  async approoveRide(r: UsherRideRow) { }
  async suggestPatient(r: UsherRideRow) { }
  async suggestDriver(r: UsherRideRow) { }


  async assign(ride: Ride, driver: Driver, notify = false) {

    ride.driverId.value = driver.id.value;
    ride.status.value = RideStatus.waitingForStart;
    await ride.save();

    if (notify) {
      let mobile = driver.mobile.value;
      let patientName = this.context.for(Patient).findId(ride.patientId.value);
      let fromName = this.context.for(Location).findId(ride.fromLocation.value);
      let toName = this.context.for(Location).findId(ride.toLocation.value);

      let message = `Hi, please 
        Collect-'${(patientName)}' 
        From-${(fromName)} 
        To-${(toName)} 
        At-${(ride.date)} ${(ride.dayPeriod)} 
        , Thanks
        for more details click ${("https://riding/" + ride.id.value)}`;

      this.SendSms(mobile, message);
    }

    //Usher.retrieve();
  }

  getSelectedDrivers(): Driver[] {
    return new Driver[0];
  }

  getSelectedPatients(): Patient[] {
    return new Patient[0];
  }

  async SendSms(mobile: string, message: string) {
    await console.info(`Sms '${(message)}' sent to '${(mobile)}'`)
  }

}
