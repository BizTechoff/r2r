import { Component, OnInit } from '@angular/core';
import { SelectValueDialogComponent } from '@remult/angular';
import { Context, StringColumn, ValueListItem } from '@remult/core';
import { DialogService } from '../../common/dialog';
import { DynamicServerSideSearchDialogComponent } from '../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component';
import { InputAreaComponent } from '../../common/input-area/input-area.component';
import { SmsService } from '../../shared/smsService';
import { Driver } from '../drivers/driver';
import { DayPeriod } from '../drivers/driverPrefs';
import { Patient } from '../patients/patient';
import { ByDate, ByDateColumn, Usher } from '../usher/usher';
import { Ride, RideStatus } from './ride';

@Component({
  selector: 'app-rides',
  templateUrl: './rides.component.html',
  styleUrls: ['./rides.component.scss']
})
export class RidesComponent implements OnInit {

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
          ride.status.value = RideStatus.waitingFor30Start;
          await ride.save();
          if (await SmsService.SendApproovedToDriver(ride.driverId.value)) {
            this.snakebar.info("Sms Sent To Driver")
          }
          // await this.retrieve();
        }
      },
    )
  }

  ridesSettings = this.context.for(Ride).gridSettings({
    allowCRUD: false,
    // allowDelete: false,
    rowButtons: [{
      textInMenu: "Find Driver",
      click: async (r) => await this.openSuggestedDriversForRideDialog(r),
      icon: "person_search",
      visible: (r) => !r.isNew(),
      showInLine: true,
    }, {
      textInMenu: "Remove Driver",
      // click: async (p) => await this.openRideDialog(p),
      icon: "person_remove",
      visible: (d) => !d.isNew(),
      // showInLine: true,
      click: async (r) => {
        // console.log(r);
        // let e: string;
        r.driverId.value = '';
        await r.save();
      },
    }, {
      textInMenu: "______________",//seperator
      //textInMenu: "<hr/>",
    }, {
      textInMenu: "Edit Ride",
      // click: async (p) => await this.openRideDialog(p),
      icon: "edit",
      visible: (d) => !d.isNew(),
      // showInLine: true,
      click: async (r) => {

        await this.openRideDialog(r);
        // console.log(r);
        // let e: string;
        // r.driverId.value = '';
        // await r.save();
      },
    }, {
      textInMenu: "Approove",
      // click: async (p) => await this.openRideDialog(p),
      icon: "ok",
      visible: (r) => r.status.value === RideStatus.waitingFor20UsherApproove,
      // showInLine: true,
      click: async (r) => {

        await this.openApprooveDialog(r);
        // console.log(r);
        // let e: string;
        // r.driverId.value = '';
        // await r.save();
      },
    }, {
      textInMenu: "Delete Ride",
      // click: async (p) => await this.openRideDialog(p),
      icon: "delete",
      visible: (d) => !d.isNew(),
      // showInLine: true,

      click: async (r) => {
        let name = (await this.context.for(Patient).findId(r.patientId.value)).name.value;
        if (await this.snakebar.confirmDelete(name)) {
          await r.delete();
        }
      },
    },],
    numOfColumnsInGrid: 10,
    columnSettings: r => [
      {
        column: r.driverId,
        click: async clkRide => {
          // console.log(clkRide.id.va)
          if (clkRide.id == undefined || clkRide.id.value == undefined) {
            await this.openDriversDialog(clkRide);
          }
          else {
            await this.openSuggestedDriversForRideDialog(clkRide);
          }
        }
      },
      r.status,
      r.date,
      r.dayOfWeek,
      r.dayPeriod,
      r.patientId,
      r.from,
      r.to,
    ],
    // where: r =>
    //   r.id && r.id.value && r.id.value.length > 0
    //     ? this.byDate.value.filter(r.date)
    //     : r.isHasEscort.isEqualTo(true).or(r.isHasEscort.isEqualTo(false)),
    orderBy: r => [{ column: r.date, descending: true }],
    // saving: r => {r.dayOfWeek.value = Utils.getDayOfWeek(r.date.getDayOfWeek())},

  });
  byDate = new ByDateColumn({
    valueChange: () => this.ridesSettings.reloadData(),
    defaultValue: ByDate.all
  });//(ByDate.today);

  constructor(private context: Context, private snakebar: DialogService) { }

  ngOnInit() {
  }

  async openRideDialog(ride: Ride) {
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Edit Ride",
        columnSettings: () => [
          ride.from,
          ride.to,
          ride.date, {
            column: ride.dayPeriod,
            valueList: [DayPeriod.morning, DayPeriod.afternoon]
          },
          ride.isHasBabyChair,
          ride.isHasWheelchair,
          ride.isHasExtraEquipment,
          ride.isHasEscort,
          // {
          //   column: ride.isHasEscort,
          //   allowClick: () => {return true;},
          //   click: () => {// not trigger
          //     console.log("clickclik");
          //     if (ride.isHasEscort.value) {
          //       ride.escortsCount.value = Math.max(1, ride.escortsCount.value);
          //     }
          //   },
          // },
          {
            column: ride.escortsCount,
            visible: () => ride.isHasEscort.value,
          },
        ],
        ok: async () => {
          //PromiseThrottle
          // ride.driverId.value = undefined;
          await ride.save();
        }
      },
    )
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
        caption: `${d.name} | ${d.mobile} | ${d.days} | ${d.lastStatus}`,
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
        r.status.value = RideStatus.waitingFor30Start,
          await r.save();
        this.snakebar.info(`Sending Sms To Driver: ${x.caption}`);
        // this.retrieveDrivers();
      },
    }));
  }



  async refresh() {
    await this.ridesSettings.reloadData();
  }

}
