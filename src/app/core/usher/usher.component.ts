import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DateColumn, Filter, GridSettings, ServerController, ServerFunction, ServerMethod } from '@remult/core';
import { getRideList4UsherParams, ride4Usher } from '../../shared/types';
import { Roles } from '../../users/roles';
import { Driver, openDriver } from '../drivers/driver';
import { Location, LocationIdColumn, LocationType } from '../locations/location';
import { Patient } from '../patients/patient';
import { PatientCrudComponent } from '../patients/patient-crud/patient-crud.component';
import { addRide, openRide, Ride, RideStatus } from '../rides/ride';
import { MabatGroupBy } from './mabat';
import { SetDriverComponent } from './set-driver/set-driver.component';
import { ShowRidesComponent, UsherRowStatus } from './show-rides/show-rides.component';
import { addDays, Usher, UsherRideGroup, UsherRideRow } from './usher';



@ServerController({ key: 'usherParams', allowed: true })
class usherParams {//dataControlSettings: () => ({width: '150px'}), 
  date = new DateColumn({ defaultValue: new Date(2021,2,3), valueChange: async () => { await this.onChanged(); } });
  fid = new LocationIdColumn({ valueChange: async () => { await this.onChanged(); } }, this.context);
  tid = new LocationIdColumn({ valueChange: async () => { await this.onChanged(); } }, this.context);
  // date = new DateColumn({ defaultValue: new Date(), valueChange: async () => { if(this.ready) await this.retrieveRideList4Usher(1); } });
  // fid = new LocationIdColumn({ valueChange: async () => { if(this.ready) await this.retrieveRideList4Usher(2); } }, this.context);
  // tid = new LocationIdColumn({ valueChange: async () => { if(this.ready) await this.retrieveRideList4Usher(3); } }, this.context);
  constructor(private context: Context) { }
  ready = false;
  onChanged = async () => {};
  
  @ServerMethod()
  async retrieveRideList4Usher(id:number): Promise<ride4Usher[]> {
    var result: ride4Usher[] = [];
// console.log(id);
    for await (const ride of this.context.for(Ride).iterate({
      where: r => r.date.isEqualTo(this.date)
        .and(r.status.isNotIn(...[RideStatus.succeeded]))
        .and(this.fid.value ? r.fromLocation.isEqualTo(this.fid) : new Filter(x => { /* true */ }))
        .and(this.tid.value ? r.toLocation.isEqualTo(this.tid) : new Filter(x => { /* true */ })),
    })) {
      let from = (await this.context.for(Location).findId(ride.fromLocation.value));
      let fromName = from.name.value;
      let fromIsBorder = from.type.value == LocationType.border;
      let to = (await this.context.for(Location).findId(ride.toLocation.value));
      let toName = to.name.value;
      let toIsBorder = to.type.value == LocationType.border;
      let key = `${fromName}-${toName}`;

      let row = result.find(r => r.key === key);
      if (!(row)) {
        row = {
          key: key,
          fromIsBorder: fromIsBorder,
          toIsBorder: toIsBorder,
          fromId: from.id.value,
          toId: to.id.value,
          from: fromName,
          to: toName,
          inProgress: 0,
          needApprove: 0,
          needDriver: 0,
          passengers: 0,
          ridesCount: 0,
          ids: [],
        };
        result.push(row);
      }

      row.inProgress += ([RideStatus.waitingForPickup, RideStatus.waitingForArrived].includes(ride.status.value) ? 1 : 0);
      row.needApprove += (ride.status.value == RideStatus.waitingForAccept ? 1 : 0);
      row.needDriver += (ride.isHasDriver() ? 0 : 1);
      row.passengers += ride.passengers();
      row.ridesCount += 1;
    }
    
    result.sort((r1, r2) => (r1.from + '-' + r1.to).localeCompare(r2.from + '-' + r2.to));

    return result;
  }
}

@Component({
  selector: 'app-usher',
  templateUrl: './usher.component.html',
  styleUrls: ['./usher.component.scss']
})
export class UsherComponent implements OnInit {

  params = new usherParams(this.context);
  ridesGrid: GridSettings<Ride>;

  //for(UsherRideRow)
  //ridesGrid : DataList<Ride>{};
  rides2: UsherRideGroup;
  rides: ride4Usher[];
  clientLastRefreshDate: Date = new Date();
  demoDates: string;
  static lastRefreshDate: Date = new Date();//client time

  constructor(public context: Context) {
  }

  async ngOnInit() {
    let date = new Date(2021, 2, 3);
    await this.refresh();
    this.params.ready = true;
    this.params.onChanged =  async() => {await this.refresh();};
  }

  filter(r: Ride, from: string, to: string): Filter {
    return r.date.isEqualTo(this.params.date)
      .and(r.status.isNotIn(...[RideStatus.succeeded]))
      .and(from && (from.trim().length > 0) ? r.fromLocation.isEqualTo(from) : new Filter(x => { }))
      .and(to && (to.trim().length > 0) ? r.toLocation.isEqualTo(to) : new Filter(x => { }));
  }

  async prevDay() {
    this.params.date.value = addDays(-1, this.params.date.value);
    console.log(this.params.date.value);
  }

  async nextDay() {
    this.params.date.value = addDays(+1, this.params.date.value);
    console.log(this.params.date.value);
  }

  async openBackRide(r: Ride): Promise<void> {

    this.context.openDialog(ShowRidesComponent, sr => sr.args = {
      date: this.params.date.value,
      from: r.fromLocation.value,
      to: r.toLocation.value,
      status: UsherRowStatus.backRide,
    });
  }

  async openApproveDriver(r: ride4Usher) {

    this.context.openDialog(ShowRidesComponent, sr => sr.args = {
      date: this.params.date.value,
      from: r.fromId,
      to: r.toId,
      status: UsherRowStatus.approve4Driver,
    });
  }



  async openShowRides(r: ride4Usher) {
    this.context.openDialog(ShowRidesComponent, sr => sr.args = {
      date: this.params.date.value,
      from: r.fromId,
      to: r.toId,
      status: UsherRowStatus.all,
    });

  }


  async openSetDriver(r: ride4Usher) {
    this.context.openDialog(SetDriverComponent, sr => sr.args = {
      date: this.params.date.value,
      from: r.fromId,
      to: r.toId,
    });
  }

  attachToDriver() {
  }

  items: Ride[];
  async refresh() {
    // console.log('refresh, ' + this.params.date.value);
    this.clientLastRefreshDate = new Date();
    UsherComponent.lastRefreshDate = new Date();
    // await this.ridesGrid.reloadData();
    // let params: getRideList4UsherParams = {
    //   date: this.selectedDate.value,
    //   fromId: this.selectedFrom.value,
    //   toId: this.selectedTo.value,
    // };
    this.params.onChanged = async () => {};
    this.rides = await this.params.retrieveRideList4Usher(0);// await UsherComponent.retrueveRideList4Usher(this.params);
    this.params.onChanged =  async() => {await this.refresh();};
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

  @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
  static async retrueveRideList4Usher(params: usherParams, context?: Context): Promise<ride4Usher[]> {
    var result: ride4Usher[] = [];
    console.log('received: ' + params.date);

    for await (const ride of context.for(Ride).iterate({
      where: r => r.date.isEqualTo(params.date)
        .and(r.status.isNotIn(...[RideStatus.succeeded]))
        .and(params.fid.value ? r.fromLocation.isEqualTo(params.fid) : new Filter(x => { /* true */ }))
        .and(params.tid.value ? r.toLocation.isEqualTo(params.tid) : new Filter(x => { /* true */ })),
    })) {
      let from = (await context.for(Location).findId(ride.fromLocation.value));
      let fromName = from.name.value;
      let fromIsBorder = from.type.value == LocationType.border;
      let to = (await context.for(Location).findId(ride.toLocation.value));
      let toName = to.name.value;
      let toIsBorder = to.type.value == LocationType.border;
      let key = `${fromName}-${toName}`;

      let row = result.find(r => r.key === key);
      if (!(row)) {
        row = {
          key: key,
          fromIsBorder: fromIsBorder,
          toIsBorder: toIsBorder,
          fromId: from.id.value,
          toId: to.id.value,
          from: fromName,
          to: toName,
          inProgress: 0,
          needApprove: 0,
          needDriver: 0,
          passengers: 0,
          ridesCount: 0,
          ids: [],
        };
        result.push(row);
      }

      row.inProgress += ([RideStatus.waitingForPickup, RideStatus.waitingForArrived].includes(ride.status.value) ? 1 : 0);
      row.needApprove += (ride.status.value == RideStatus.waitingForAccept ? 1 : 0);
      row.needDriver += (ride.isHasDriver() ? 0 : 1);
      row.passengers += ride.passengers();
      row.ridesCount += 1;
    }

    // console.log(result)
    result.sort((r1, r2) => (r1.from + '-' + r1.to).localeCompare(r2.from + '-' + r2.to));

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
