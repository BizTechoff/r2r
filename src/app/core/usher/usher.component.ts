import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DataList, DateColumn, Filter, GridSettings, IdColumn, NumberColumn, ServerFunction, StringColumn, ValueListColumn, ValueListItem } from '@remult/core';
import { settings } from 'cluster';
import { DynamicServerSideSearchDialogComponent } from '../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component';
import { GridDialogComponent } from '../../common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { getRideList4UsherParams, ride4Usher } from '../../shared/types';
import { Utils } from '../../shared/utils';
import { Roles } from '../../users/roles';
import { Driver, openDriver } from '../drivers/driver';
import { Location, LocationIdColumn } from '../locations/location';
import { openPatient, Patient } from '../patients/patient';
import { addRide, openRide, Ride, RideStatus } from '../rides/ride';
import { ApproveDriverComponent } from './approve-driver/approve-driver.component';
import { MabatGroupBy } from './mabat';
import { SetDriverComponent } from './set-driver/set-driver.component';
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
    this.selectedFrom = new LocationIdColumn({
      dataControlSettings: () => ({
        getValue: () => this.context.for(Location).lookup(this.selectedFrom).name.value,
        hideDataOnInput: true,
        clickIcon: 'search',
        width: "150px",
        click: () => {
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Location, {
              onSelect: l => this.selectedFrom.value = l.id.value,
              searchColumn: l => l.name,
              where: l => [l.id.isIn(...this.rides.map(r => r.fromId))],
            }));
        }
      }),
      caption: "From"
    }, this.context);
    this.selectedTo = new LocationIdColumn({ caption: "To" }, this.context);
    this.selectedDate = new DateColumn({ caption: "Date", defaultValue: new Date(date.getFullYear(), date.getMonth(), date.getDate()) });
    this.toolbar = new DataAreaSettings({
      columnSettings: () => [
        [this.selectedDate, this.selectedFrom, this.selectedTo]
      ],
    });

    // this.userOptions = 

    this.ridesGrid = this.context.for(Ride).gridSettings({
      where: r => this.filter(r,
        this.selectedFrom.value ? this.selectedFrom.value : "",
        this.selectedTo.value ? this.selectedTo.value : ""),
      orderBy: r => [
        { column: r.date, descending: false },
        { column: r.dayPeriod, descending: true },
        // { column: r.fromLocation, descending: false, },//todo: sort by fromLocation.getName()?
        // { column: r.toLocation, descending: false },
      ],

      allowCRUD: false,
      numOfColumnsInGrid: 10,
      columnSettings: r => [
        r.fromLocation,
        r.toLocation,
        // r.driverId,
        // r.visitTime,
        // r.patientId,
        // {
        //   column: new NumberColumn({}),
        //   caption: "age",
        //   getValue: r => 0,// async r => (await this.context.for(Patient).findId(r.patientId.value)).age(this.selectedDate),
        // },
        {
          column: new NumberColumn({}),
          caption: "pass",
          getValue: r => r.passengers(),
        },
        {
          column: new NumberColumn({}),
          caption: "rides",
          getValue: r => r.passengers(),
        },
        {
          column: new NumberColumn({}),
          caption: "open",
          getValue: r => r.passengers(),
        },
        {
          column: new NumberColumn({}),
          caption: "no-driver",
          getValue: r => r.passengers(),
          // click: r => this.openSetDriver(r),
        },
        {
          column: new NumberColumn({}),
          caption: "need-approved",
          getValue: r => r.passengers(),
        },
        // {
        //   column: new StringColumn({}),
        //   caption: "",
        //   clickIcon: r.isHasWheelchair.value ? "" : "",//Equipment
        // },
        // r.status,
      ],
      rowButtons: [{
        textInMenu: "Set Driver",
        // click: async (r) => await this.openSetDriver(r),
        icon: "person_add",
        showInLine: true,
        visible: (r) => { return true /*r.'no-driver' > 0*/; },
      }, {
        textInMenu: "Approve Driver",
        // click: async (r) => await this.openApproveDriver(r),
        icon: "how_to_reg",
        showInLine: true,
        visible: (r) => { return true /*r.'no-driver' > 0*/; },
      }, {
        textInMenu: "Back Ride",
        click: async (r) => await this.openBackRide(r),
        icon: "arrow_back",
        showInLine: true,
        visible: (r) => { return true /*r.'no-driver' > 0*/; },
      },],
    });


    // this.clientLastRefreshDate = new Date();
    // this.demoDates = `${formatDate(Usher.fromDemoTodayMidnight, "dd/MM/yyy", "en-US")} - ${formatDate(Usher.toDemoTodayMidnight, "dd/MM/yyy", "en-US")}`;
    await this.refresh();
  }

  filter(r: Ride, from: string, to: string): Filter {
    return r.date.isEqualTo(this.selectedDate)
      .and(r.status.isNotIn(...[RideStatus.succeeded]))
      .and(from && (from.trim().length > 0) ? r.fromLocation.isEqualTo(from) : new Filter(x => { }))
      .and(to && (to.trim().length > 0) ? r.toLocation.isEqualTo(to) : new Filter(x => { }));
  }

  async openBackRide(r: Ride): Promise<void> {

    // let from = (await this.context.for(Location).findId(r.fromLocation.value)).name.value;
    // let to = (await this.context.for(Location).findId(r.toLocation.value)).name.value;

    this.context.openDialog(ApproveDriverComponent, sr => sr.args = {
      date: this.selectedDate.value,
      from: r.fromLocation.value,
      to: r.toLocation.value,
    });
  }

  async openApproveDriver(r: ride4Usher) {

    // let from = (await this.context.for(Location).findId(r.fromLocation.value)).name.value;
    // let to = (await this.context.for(Location).findId(r.toLocation.value)).name.value;

    this.context.openDialog(ApproveDriverComponent, sr => sr.args = {
      date: this.selectedDate.value,
      from: r.fromId,
      to: r.toId,
    });
  }


  async openSetDriver(r: ride4Usher) {

    // let from = (await this.context.for(Location).findId(r.fromLocation.value)).name.value;
    // let to = (await this.context.for(Location).findId(r.toLocation.value)).name.value;

    this.context.openDialog(SetDriverComponent, sr => sr.args = {
      date: this.selectedDate.value,
      from: r.fromId,
      to: r.toId,
    });

    // this.context.openDialog(GridDialogComponent, gd => gd.args = {
    //   title: `Rides: ${from} to ${to}`,
    //   settings: this.context.for(Ride).gridSettings({
    //     where: row => this.filter(row, r.fromLocation.value, r.toLocation.value),
    //     orderBy: row => row.visitTime,
    //     allowCRUD: false,
    //     columnSettings: r => [
    //       r.fromLocation,
    //       r.toLocation,
    //       r.driverId,
    //       r.visitTime,
    //       {
    //         column: new NumberColumn({}),
    //         caption: "pass",
    //         getValue: r => r.passengers(),
    //       },
    //     ],
    //     allowSelection: true,
    //   }),
    //   buttons: [
    //     {
    //       text: "AttachToDriver",
    //       click: () => { this.attachToDriver() },
    //       visible: () => this.ridesGrid.selectedRows.length > 0,
    //     }
    //   ],
    // });
  }

  attachToDriver() {
  }

  async selectedFromChanged() {
    console.log(this.selectedFrom.value);
  }


  async selectedDateChanged() { console.log(this.selectedDate.value); }

  items: Ride[];
  async refresh() {
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
    let changed = await openPatient(r.pid, this.context);
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
