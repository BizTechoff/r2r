import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, ServerFunction, ValueListItem } from '@remult/core';
import { DialogService } from '../../common/dialog';
import { Usher } from '../usher/usher';
import { ByDate, ByDateColumn } from "../usher/ByDate";
import { Ride } from './ride';
import { SelectValueDialogComponent } from '@remult/angular';
import { Driver } from '../drivers/driver';
import { usherDriversResponse } from '../../shared/types';
import { Utils } from '../../shared/utils';

@Component({
  selector: 'app-rides',
  templateUrl: './rides.component.html',
  styleUrls: ['./rides.component.scss']
})
export class RidesComponent implements OnInit {


  ridesSettings = this.context.for(Ride).gridSettings({
    rowButtons: [{
      textInMenu: "Find Driver",
      click: async (r) => await this.openDriversDialog(r),
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
        let e: string;
        r.driverId.value = e;
        await r.save();
      },
    },],
    numOfColumnsInGrid: 10,
    columnSettings: r => [
      {
        column: r.driverId,
        click: async clkRide => {
          await this.openDriversDialog(clkRide);
        }
      },
      r.date,
      r.dayOfWeek,
      r.dayPeriod,
      r.patientId,
      r.from,
      r.to,
    ],
    allowCRUD: true,
    where: r =>
      this.byDate.value.filter(r.date),
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

  async openDriversDialog(r: Ride) {
    // console.log(r.date);
    let relevantDrivers = await Usher.getReleventDriversForRide(r.id.value);

    let items = (await this.context.for(Driver).find({
      where: r => r.id.isIn(...relevantDrivers)
    }));
    // console.log(items.length);

    let drivers: ValueListItem[] = [];
    var order: { count: number, item: ValueListItem }[] = [];
    items.forEach(async d => {
      let name = d.name.value;
      let mobile = d.mobile.value;
      let days = 0;
      let location = "";

      let finds = await this.context.for(Ride).find({
        limit: 1,
        where: r => r.driverId.isEqualTo(d.id),
        orderBy: r => [{ column: r.date, descending: true }]
      });
      if (finds && finds.length > 0) {

        let now = new Date();//now
        let rDate = finds[0].date.value;
        let diff = +now - +rDate;
        days = (-1 * (Math.ceil(diff / 1000 / 60 / 60 / 24) + 1));
      }

      let caption = name + " | " + mobile + " | " + days;
      let item = { id: d.id.value, caption: caption } as ValueListItem;
      drivers.push(item);

      order.push({
        count: days,
        item: item,
      });
    });
    // console.log(order);
    order.sort((a, b) => b.count - a.count);//??PROBLEM
    console.log(order.length);

    // console.log(order);
    // order.forEach(o => {
    //   drivers.push(o.item);
    // });

    this.context.openDialog(SelectValueDialogComponent, x => x.args({
      title: `Relevent Drivers (${drivers.length})`,
      values: drivers,
      // orderBy:r => [{ column: r.date, descending: true }]
      onSelect: async x => {
        // let ride = await this.context.for(Ride).findId(x.item.id);
        r.driverId.value = x.id;
        await r.save();
        // this.retrieveDrivers();
      },
    }))
  }

  async refresh() {
    await this.ridesSettings.reloadData();
  }

  async assign() {
    this.snakebar.info("Starting assignment..")
    let count = await Usher.organize(
      this.byDate.value,
      this.context,
    );
    if (count > 0) {
      this.ridesSettings.initOrigList();
      // this.refresh();
    }
    this.snakebar.info(`Assigned ${count} rides.`)
  }

}
