import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, ServerFunction } from '@remult/core';
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
      icon: "driver",
      visible: (r) => !r.isNew(),
      showInLine: true,
    },{
      textInMenu: "Remove Driver",
      // click: async (p) => await this.openRideDialog(p),
      icon: "driver",
      visible: (d) => !d.isNew(),
      // showInLine: true,
      click: async (r) => {
        // console.log(r);
        // r.driverId.value = null;
        // await r.save();
      },
    },],
    numOfColumnsInGrid: 10,
    columnSettings: r => [
      {
        column: r.driverId,
        click: async r => {

          let relevantdrivers = await Usher.getReleventDriversForRide(r.id.value);

          let drivers = (await this.context.for(Driver).find({
            where: d => d.id.isIn(...relevantdrivers),
      
          })).map(r => ({
            item: r,
            caption: r.name.value,
          }));
      
      
          this.context.openDialog(SelectValueDialogComponent, x => x.args({
            title: `Relevent Drivers (${drivers.length})`,
            values: drivers,
            onSelect: async x => {
              r.driverId.value = x.item.id.value;
              await r.save();
              // this.retrieveDrivers();
            },
          }))




          
          // let drivers = (await Usher.getReleventDriversForRide(r.id.value)).map(d => ({
          //   item: d,
          //   caption: d.,
          // }));
          // this.context.openDialog(SelectValueDialogComponent, x => x.args({
          //   title: `Relevent Drivers (${drivers.length})`,
          //   values: drivers,
          //   onSelect: x => r.driverId.value = x.item.driverId,
          // }))
        }
      },
      r.dayOfWeek,
      r.dayPeriod,
      r.patientId,
      r.from,
      r.to,
    ],
    allowCRUD: true,
    where: r =>
      this.byDate.value.filter(r.date),
      orderBy: r=>[{ column: r.date, descending: true }],
      // saving: r => {r.dayOfWeek.value = Utils.getDayOfWeek(r.date.getDayOfWeek())},

  });
  byDate = new ByDateColumn({
    valueChange: () => this.ridesSettings.reloadData(),
    defaultValue: ByDate.all
  });//(ByDate.today);

  // @ServerFunction({ allowed: true })
  // static async findDrivers(rideId: string, context?: Context) {
  //   var drivers: usherDriversResponse[] =
  //     await Usher.getReleventDriversForRide(rideId);

  //   // var result: { id: string, name: string, reason: string }[] = [];
  //   // var i = 0;
  //   // drivers.forEach(d => {
  //   //   result.push({
  //   //     id: d.id.value,
  //   //     name: d.name.value,
  //   //     reason: 'סתם סיבה'
  //   //   });
  //   //   if (i++ > 100)
  //   //     break;

  //   // }
  //   return drivers;
  // }

  constructor(private context: Context, private snakebar: DialogService) { }

  ngOnInit() {
  }

async openDriversDialog(r:Ride) {
  let relevantDrivers = await Usher.getReleventDriversForRide(r.id.value);

    let drivers = (await this.context.for(Driver).find({
      where: d => d.id.isIn(...relevantDrivers),

    })).map(d => ({
      item: d,
      caption: d.name.value,
    }));


    this.context.openDialog(SelectValueDialogComponent, x => x.args({
      title: `Relevent Drivers (${drivers.length})`,
      values: drivers,
      onSelect: async x => {
        // let ride = await this.context.for(Ride).findId(x.item.id);
        r.driverId.value = x.item.id.value;
        await r.save();
        // this.retrieveDrivers();
      },
    }))
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
