import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { SelectValueDialogComponent } from '@remult/angular';
import { Context, DataAreaSettings, NumberColumn, StringColumn, ValueListItem } from '@remult/core';
import { DialogService } from '../../common/dialog';
import { DynamicServerSideSearchDialogComponent } from '../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { SmsService } from '../../shared/smsService';
import { Driver } from '../drivers/driver';
import { DayPeriod } from '../drivers/driverPrefs';
import { MabatIdColumn } from '../usher/mabat';
import { rides4Usher, rides4UsherGroup, ridesNoPatient, ridesWaiting4Driver, Usher, UsherRideGroup } from '../usher/usher';
import { openRide, Ride, RideStatus } from './ride';

@Component({
  selector: 'app-rides',
  templateUrl: './rides.component.html',
  styleUrls: ['./rides.component.scss']
})
export class RidesComponent implements OnInit {

  rideSettings = this.context.for(Ride).gridSettings({
    numOfColumnsInGrid: 10,
    columnSettings: (r) => [
      r.date,
      r.fromLocation,
      r.toLocation,
      r.dayPeriod,
      r.dayOfWeek,
      r.visitTime,
      r.status,
      r.patientId,
      r.driverId,
    ],
  });

  mabatSettings = new DataAreaSettings({
    columnSettings: () => [
      {
        column: new MabatIdColumn(this.context, {}),
      },],
  });

  groupRecords:UsherRideGroup;

  groupSameLocations = false;
  selectedGroupTitle: string = "";
  selectedGroupRideIds: string[] = [];
  suggestedByDrivers: ridesNoPatient[] = [];

  matTableDataSource = new MatTableDataSource<rides4Usher>();

  selectedWaiting4DriverGroupTitle: string = "";
  selectedWaiting4DriverIds: string[] = [];
  waiting4Driver: ridesWaiting4Driver[] = [];

  suggestedByDriversSettings = this.context.for(Ride).gridSettings({
    where: r => r.id.isIn(...this.selectedGroupRideIds),
    orderBy: r => [{ column: r.date, descending: true }, { column: r.dayPeriod, descending: false }],
    allowCRUD: false,
    numOfColumnsInGrid: 10,
    columnSettings: r => [
      {
        column: r.date,//"HH:mm"
      },
      r.fromLocation,
      r.toLocation,
      r.patientId,
      {
        column: new NumberColumn({ caption: "passengers" }),
        value: r.passengers(),
      },
      r.driverId,
      r.status,
    ],
    rowButtons: [{
      textInMenu: "Suggest Patient",
      click: async (r) => await this.openSuggestedPatientsForRideDialog(r),
      icon: "travel_explore",
      visible: (r) => !r.isExsistPatient(),
      showInLine: true,
    }, {
      textInMenu: "Approove Suggestion",
      icon: "thumb_up_off_alt",
      //visible: (r) => r.isSuggestedByDriver() || r.isSuggestedByUsher(),
      click: async (r) => { await this.openApprooveDialog(r); },
    }, {
      textInMenu: "Reject Suggestion",
      icon: "thumb_down_alt",
      //visible: (r) => r.isSuggestedByDriver() || r.isSuggestedByUsher(),
      click: async (r) => { await this.openApprooveDialog(r); },
    },]
  });

  waiting4DriverSettings = this.context.for(Ride).gridSettings({
    where: r => r.id.isIn(...this.selectedWaiting4DriverIds),
    orderBy: r => [{ column: r.date, descending: true }, { column: r.dayPeriod, descending: false }],
    allowCRUD: false,
    numOfColumnsInGrid: 10,
    columnSettings: r => [
      // r.date,
      {
        column: r.visitTime,
        displayValue: r.isHasVisitTime() ? formatDate(r.visitTime.value.getTime(), "HH:mm", 'en-US') : "",
      },
      r.fromLocation,
      r.toLocation,
      r.patientId,
      {
        column: new NumberColumn({ caption: "age" }),
        value: 0,
      },
      {
        column: new NumberColumn({ caption: "passengers" }),
        getValue: r => r.passengers(),
      },
      {
        column: new NumberColumn({ caption: "mobile" }),
        value: '',
      },
      r.driverId,
      r.status,
    ],
    rowButtons: [{
      textInMenu: "Suggest Driver",
      click: async (r) => await this.openSuggestedDriversForRideDialog(r),
      icon: "person_search",
      visible: (r) => !r.isExsistDriver(),
      showInLine: true,
    }, {
      textInMenu: "Remove Driver",
      icon: "person_remove",
      visible: (r) => r.isExsistDriver(),
      click: async (r) => {
        if (this.snakebar.confirmDelete("Are you sure remove driver")) {
          r.driverId.value = '';
          r.status.value = RideStatus.waitingForDriver;
          if (!(r.isExsistPatient())) {
            r.status.value = RideStatus.waitingForPatient;
          }
          if (!(r.isExsistDriver())) {
            r.status.value = RideStatus.waitingForPatientAndDriver;
          } 
          await r.save();
        }
      },
      showInLine: true,
    },]
  });

  constructor(private context: Context, private snakebar: DialogService) { }

  async ngOnInit() {
    await this.retrieve();
  }

  async groupExpanded(ride: ridesNoPatient) {
    this.selectedGroupTitle = ride.title;
    this.selectedGroupRideIds = this.suggestedByDrivers.find(grp => grp.title === this.selectedGroupTitle)
      .rows.map(r => r.id) as string[];
    // await this.suggestedByDriversSettings.initOrigList();
  }

  async waiting4DriverGroupExpanded(ride: ridesWaiting4Driver) {
    this.selectedWaiting4DriverGroupTitle = ride.title;
    this.selectedWaiting4DriverIds = this.waiting4Driver.find(grp => grp.title === this.selectedWaiting4DriverGroupTitle)
      .rows.map(r => r.id) as string[];
    // await this.suggestedByDriversSettings.initOrigList();
  }

  async retrieve() {


    this.groupRecords = await Usher.getRides4Usher();


    // this

    // this.suggestedByDrivers = await Usher.getSuggestedRidesByDrivers();

    // this.waiting4Driver = await Usher.getWaitingRides4Driver();
  }


  async openApprooveDialog(ride: Ride) {

    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Approove Ride",
        columnSettings: () => [
          {
            caption: "Send Sms To Driver",
            column: new StringColumn({}),
          },
        ],
        ok: async () => {
          ride.status.value = RideStatus.waitingForStart;
          await ride.save();
          if (await SmsService.SendApproovedToDriver(ride.driverId.value)) {
            this.snakebar.info("Sms Sent To Driver")
          }
          // await this.retrieve();
        }
      },
    )
  }

  async openRideDialog(ride: Ride) {
    await openRide(ride.id.value, this.context);
  }

  async openDriversDialog(r: Ride) {

    this.context.openDialog(DynamicServerSideSearchDialogComponent,
      x => x.args(Driver, {
        onSelect: l => {
          r.driverId.value = l.id.value;
        },
        searchColumn: l => l.name
      }));
  }

  async openSuggestedDriversForRideDialog(r: Ride) {

    let values: ValueListItem[] = [];
    // console.log(r.date);
    let drivers = await Usher.getSuggestedDriversForRide(r.id.value);
    for (const d of drivers) {
      values.push({
        id: d.id,
        caption: `${d.name} | ${d.mobile} | ${d.days}`,// | ${d.lastStatus.id}`,
      });
    };
    // console.table(relevantDrivers);
    this.context.openDialog(SelectValueDialogComponent, x => x.args({
      title: `Suggested Drivers (${drivers.length})`,
      values: values,
      // orderBy:r => [{ column: r.date, descending: true }]
      onSelect: async x => {
        // let ride = await this.context.for(Ride).findId(x.item.id);
        r.driverId.value = x.id;
        r.status.value = RideStatus.waitingForStart,
          await r.save();
        this.snakebar.info(`Sending Sms To Driver: ${x.caption}`);
        // this.retrieveDrivers();
      },
    }));
  }

  async openSuggestedPatientsForRideDialog(r: Ride) {

    let values: ValueListItem[] = [];
    let patients = await Usher.getSuggestedPatientsForRide(r.id.value);
    for (const p of patients) {
      values.push({
        id: p.id,
        caption: `${p.from} | ${p.to} | ${p.date} | ${p.passengers}`,
      });
    };
    // console.table(relevantDrivers);
    this.context.openDialog(SelectValueDialogComponent, x => x.args({
      title: `Suggested Patients (${patients.length})`,
      values: values,
      // orderBy:r => [{ column: x.name, descending: true }]
      onSelect: async x => {
        r.patientId.value = x.id;
        r.status.value = RideStatus.waitingForUsherApproove;
        await r.save();
        this.snakebar.info(`Patient '${x.caption}' successfully Set To Ride, Waiting for Approove`);
        // this.retrieveDrivers();
      },
    }));
  }

  // ridesSettings = this.context.for(Ride).gridSettings({
  //   allowCRUD: false,
  //   where: r => r.id.isIn(...this.selectedGroupRideIds),
  //   orderBy: r => [{ column: r.date, descending: true }, { column: r.dayPeriod, descending: false }],
  //   numOfColumnsInGrid: 10,
  //   columnSettings: r => [
  //     {
  //       column: r.driverId,
  //       click: async clkRide => {
  //         // console.log(clkRide.id.va)
  //         if (clkRide.id == undefined || clkRide.id.value == undefined) {
  //           await this.openDriversDialog(clkRide);
  //         }
  //         else {
  //           await this.openSuggestedDriversForRideDialog(clkRide);
  //         }
  //       }
  //     },
  //     r.status,
  //     r.date,
  //     r.dayOfWeek,
  //     r.dayPeriod,
  //     r.patientId,
  //     r.from,
  //     r.to,
  //   ],
  //   // allowDelete: false,
  //   rowButtons: [{
  //     textInMenu: "Suggest Driver",
  //     click: async (r) => await this.openSuggestedDriversForRideDialog(r),
  //     icon: "person_search",
  //     visible: (r) => !r.exsistDriver(),
  //     showInLine: true,
  //   }, {
  //     textInMenu: "Suggest Patient",
  //     click: async (r) => await this.openSuggestedDriversForRideDialog(r),
  //     icon: "travel_explore",
  //     visible: (r) => !r.exsistPatient(),
  //     showInLine: true,
  //   }, {
  //     textInMenu: "______________________",//seperator
  //     //textInMenu: "<hr/>",
  //   }, {
  //     textInMenu: "Approove",
  //     // click: async (p) => await this.openRideDialog(p),
  //     icon: "ok",
  //     visible: (r) => r.isSuggestedByDriver() || r.isSuggestedByUsher(),
  //     // showInLine: true, 
  //     click: async (r) => {

  //       await this.openApprooveDialog(r);
  //       // console.log(r);
  //       // let e: string;
  //       // r.driverId.value = '';
  //       // await r.save();
  //     },
  //   }, {
  //     textInMenu: "Remove Driver",
  //     // click: async (p) => await this.openRideDialog(p),
  //     icon: "person_remove",
  //     visible: (r) => r.exsistDriver(),
  //     // showInLine: true,
  //     click: async (r) => {
  //       // console.log(r);
  //       // let e: string;
  //       r.driverId.value = '';
  //       await r.save();
  //     },
  //   }, {
  //     textInMenu: "______________________",
  //   }, {
  //     textInMenu: "Edit Ride",
  //     // click: async (p) => await this.openRideDialog(p),
  //     icon: "edit",
  //     visible: (r) => !r.isNew(),
  //     // showInLine: true,
  //     click: async (r) => {

  //       await this.openRideDialog(r);
  //       // console.log(r);
  //       // let e: string;
  //       // r.driverId.value = '';
  //       // await r.save();
  //     },
  //   }, {
  //     textInMenu: "Delete Ride",
  //     // click: async (p) => await this.openRideDialog(p),
  //     icon: "delete",
  //     visible: (r) => !r.isNew(),
  //     // showInLine: true,

  //     click: async (r) => {
  //       let name = (await this.context.for(Patient).findId(r.patientId.value)).name.value;
  //       if (await this.snakebar.confirmDelete(name)) {
  //         await r.delete();
  //       }
  //     },
  //   },],
  //   // where: r =>
  //   //   r.id && r.id.value && r.id.value.length > 0
  //   //     ? this.byDate.value.filter(r.date)
  //   //     : r.isHasEscort.isEqualTo(true).or(r.isHasEscort.isEqualTo(false)),
  //   // saving: r => {r.dayOfWeek.value = Utils.getDayOfWeek(r.date.getDayOfWeek())},

  // });
  // byDate = new ByDateColumn({
  //   valueChange: () => this.ridesSettings.reloadData(),
  //   defaultValue: ByDate.all
  // });//(ByDate.today);

}
