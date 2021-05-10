import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DateColumn, Filter, ServerFunction } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { DynamicServerSideSearchDialogComponent } from '../../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { ride4DriverRideRegister } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Location, LocationIdColumn } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Driver } from '../driver';
import { RegisterDriver } from './registerDriver';

@Component({
  selector: 'app-driver-register',
  templateUrl: './driver-register.component.html',
  styleUrls: ['./driver-register.component.scss']
})
export class DriverRegisterComponent implements OnInit {

  driverId: string;

  selectedDate: DateColumn;
  selectedFrom: LocationIdColumn;
  selectedTo: LocationIdColumn;
  toolbar: DataAreaSettings;

  ridesToRegister: ride4DriverRideRegister[];
  rides: ride4DriverRideRegister[];

  clientLastRefreshDate: Date = new Date();
  demoDates: string;
  static lastRefreshDate: Date = new Date();//client time

  constructor(private context: Context, private dialog: DialogService) { }

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
              where: l => [l.id.isIn(...this.rides.map(r => r.fId))],
            }));
        }
      }),
      caption: "From"
    }, this.context);
    this.selectedTo = new LocationIdColumn({ caption: "To" }, this.context);
    this.selectedDate = new DateColumn({ caption: "Date", defaultValue: new Date(date.getFullYear(), date.getMonth(), date.getDate()) });
    this.toolbar = new DataAreaSettings({
      columnSettings: () => [
        this.selectedDate, this.selectedFrom, this.selectedTo,
      ],
    });

    await this.refresh();
  }

  async refresh() {
    let driver = await this.context.for(Driver).findFirst({
      where: d => d.userId.isEqualTo(this.context.user.id),
    });
    if (!(driver)) {
      throw 'Error - You are not register to use app';
    }
    this.driverId = driver.id.value;

    let result = await DriverRegisterComponent.retrieveDriverRegister(
      this.driverId,
      this.selectedDate.value,
      this.selectedFrom.value,
      this.selectedTo.value,
      this.context);

    this.rides = result.registered;
    this.ridesToRegister = result.newregistered;
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveDriverRegister(driverId: string, date: Date, fid: string, tid: string, context?: Context) {
    date = new Date(2021, 2, 3);
    var result: {
      registered: ride4DriverRideRegister[],
      newregistered: ride4DriverRideRegister[]
    } = {
      registered: [],
      newregistered: []
    };

    for await (const reg of context.for(RegisterRide).iterate({//todo: display only records that not attach by usher
      where: rg => rg.date.isEqualTo(date)
        .and(fid && (fid.trim().length > 0) ? rg.fromLoc.isEqualTo(fid) : new Filter(x => { /*true*/ }))
        .and(tid && (tid.trim().length > 0) ? rg.toLoc.isEqualTo(tid) : new Filter(x => { /*true*/ })),
    })) {
      let from = (await context.for(Location).findId(reg.fromLoc)).name.value;
      let to = (await context.for(Location).findId(reg.toLoc)).name.value;
      let registereds = (await context.for(RegisterDriver).find(
        {
          where: rg => rg.regRideId.isEqualTo(reg.id)
            .and(rg.driverId.isEqualTo(driverId)),
        }));

      if (registereds && registereds.length > 0) {
        for (const nreg of registereds) {
          let row: ride4DriverRideRegister = {
            rgId: reg.id.value,
            dRegId: nreg.id.value,
            date: reg.date.value,
            fId: reg.fromLoc.value,
            tId: reg.toLoc.value,
            from: from,
            to: to,
            pass: reg.passengers.value,
            isRegistered: (registereds && registereds.length > 0),
            dFromHour: nreg.fromHour.value,
            dToHour: nreg.toHour.value,
            dPass: nreg.seats.value,
          };
          result.registered.push(row);
        }
      }
      else {
        let row: ride4DriverRideRegister = {
          rgId: reg.id.value,
          date: reg.date.value,
          fId: reg.fromLoc.value,
          tId: reg.toLoc.value,
          from: from,
          to: to,
          pass: reg.passengers.value,
          isRegistered: (registereds && registereds.length > 0),
        };
        result.newregistered.push(row);
      }
    }

    result.registered.sort((r1, r2) => r1.from.localeCompare(r2.from));
    result.newregistered.sort((r1, r2) => r1.from.localeCompare(r2.from));

    return result;
  }

  async unregister(r: ride4DriverRideRegister) {
    let reg = await this.context.for(RegisterDriver).findId(r.dRegId);
    if (await this.dialog.confirmDelete(`Your Registration (${r.from} to ${r.to} with ${r.dPass} avaliable seats)`)) {
      await reg.delete();
      await this.refresh();
    }
  }

  async register(r: ride4DriverRideRegister) {
    let date = new Date(2021, 2, 3);
    let reg = this.context.for(RegisterDriver).create();
    reg.regRideId.value = r.rgId;
    reg.driverId.value = this.driverId;
    reg.fromHour.value = date;// todo: r.date;
    reg.toHour.value = date;// todo: r.date;

    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Register To Ride",
        columnSettings: () => [
          {
            column: reg.fromHour,
            cssClass: 'time',
          },
          reg.toHour,
          reg.seats,
        ],
        ok: async () => {
          await reg.save();
          await this.refresh();
        }
      },
    );

  }

}
