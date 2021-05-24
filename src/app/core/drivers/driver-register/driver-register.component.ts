import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DateColumn, NumberColumn, ServerController, ServerMethod } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { ride4DriverRideRegister } from '../../../shared/types';
import { Location, LocationIdColumn } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';
import { addDays } from '../../usher/usher';
import { Driver, DriverIdColumn } from '../driver';
import { DriverPrefs } from '../driverPrefs';
import { RegisterDriver } from './registerDriver';

export interface response {
  registered: ride4DriverRideRegister[],
  newregistered: ride4DriverRideRegister[],
};

@ServerController({ key: 'driverRegister', allowed: true })
class driverRegister {//dataControlSettings: () => ({width: '150px'}), 
  date = new DateColumn({ defaultValue: new Date(), valueChange: async () => { await this.onChanged(); } });
  fid = new LocationIdColumn({caption: 'From', valueChange: async () => { await this.onChanged(); } }, this.context);
  tid = new LocationIdColumn({caption: 'To',  valueChange: async () => { await this.onChanged(); } }, this.context);
  did = new DriverIdColumn({}, this.context);
  seats = new NumberColumn();
  constructor(private context: Context) { }
  ready = false;
  onChanged = async () => { };

  @ServerMethod()
  async retrieveRideList4Usher(): Promise<response> {
    var result: response = {
      registered: [],
      newregistered: []
    };

    let dLocs: string[] = [];
    for await (const pref of this.context.for(DriverPrefs).iterate({
      where: pf => pf.driverId.isEqualTo(this.did),
    })) {
      dLocs.push(pref.locationId.value);
    }

    for await (const reg of this.context.for(RegisterRide).iterate({//todo: display only records that not attach by usher
      where: rg => rg.date.isEqualTo(this.date),
      // .and(fid && (fid.trim().length > 0) ? rg.fromLoc.isEqualTo(fid) : rg.fromLoc.isIn(...dLocs))// new Filter(x => { /*true*/ }))
      // .and(tid && (tid.trim().length > 0) ? rg.toLoc.isEqualTo(tid) : rg.toLoc.isIn(...dLocs)),// new Filter(x => { /*true*/ })),
    })) {


      let isok = true;
      if ((this.fid.value) || (this.tid.value)) {
        if (this.fid.value) {
          if (!(reg.fromLoc.value == this.fid.value)) {
            isok = false;
          }
        }
        if (this.tid.value) {
          if (!(reg.toLoc.value == this.tid.value)) {
            isok = false;
          }
        }
      }
      else if (!(dLocs.includes(reg.fromLoc.value) || dLocs.includes(reg.toLoc.value))) {
        isok = false;
      }

      if (!(isok)) {
        continue;
      }

      let from = (await this.context.for(Location).findId(reg.fromLoc.value)).name.value;
      let to = (await this.context.for(Location).findId(reg.toLoc.value)).name.value;
      let registereds = (await this.context.for(RegisterDriver).find(
        {
          where: rg => rg.rgId.isEqualTo(reg.id)
            .and(rg.dId.isEqualTo(this.did)),
        }));

      if (registereds && registereds.length > 0) {
        for (const nreg of registereds) {
          let row: ride4DriverRideRegister = {
            rId: '',
            rgId: reg.id.value,
            dId: nreg.dId.value,
            date: reg.date.value,
            fId: reg.fromLoc.value,
            tId: reg.toLoc.value,
            from: from,
            to: to,
            pass: nreg.seats.value,
            isRegistered: true,// (registereds && registereds.length > 0),
            dFromHour: nreg.fromHour.value,
            dToHour: nreg.toHour.value,
            dPass: this.seats.value,
          };
          result.registered.push(row);
        }
      }
      else {
        if (reg.passengers.value <= this.seats.value) {
          let row: ride4DriverRideRegister = {
            rId: '',
            rgId: reg.id.value,
            // dId: nreg.driverId.value,
            date: reg.date.value,
            fId: reg.fromLoc.value,
            tId: reg.toLoc.value,
            from: from,
            to: to,
            pass: reg.passengers.value,
            isRegistered: false,// (registereds && registereds.length > 0),
            dPass: this.seats.value,
          };
          result.newregistered.push(row);
        }
      }
    }

    for await (const ride of this.context.for(Ride).iterate({//todo: display only records that not attach by usher
      where: r => r.date.isEqualTo(this.date.value)
        // .and(fid && (fid.trim().length > 0) ? r.fromLocation.isEqualTo(fid) : r.fromLocation.isIn(...dLocs))// new Filter(x => { /*true*/ }))
        // .and(tid && (tid.trim().length > 0) ? r.toLocation.isEqualTo(tid) : new Filter(x => { /*true*/ }))
        .and(r.status.isEqualTo(RideStatus.waitingForDriver)),
    })) {

      let isok = true;
      if ((this.fid.value) || (this.tid.value)) {
        if (this.fid.value) {
          if (!(ride.fromLocation.value == this.fid.value)) {
            isok = false;
          }
        }
        if (this.tid.value) {
          if (!(ride.toLocation.value == this.tid.value)) {
            isok = false;
          }
        }
      }
      else if (!(dLocs.includes(ride.fromLocation.value) || dLocs.includes(ride.toLocation.value))) {
        isok = false;
      }

      if (!(isok)) {
        continue;
      }

      let from = (await this.context.for(Location).findId(ride.fromLocation.value)).name.value;
      let to = (await this.context.for(Location).findId(ride.toLocation.value)).name.value;

      let registereds = (await this.context.for(RegisterDriver).find(
        {
          where: rg => rg.rId.isEqualTo(ride.id)
            .and(rg.dId.isEqualTo(this.did)),
        }));

      if (registereds && registereds.length > 0) {
        for (const nreg of registereds) {
          let row: ride4DriverRideRegister = {
            rId: ride.id.value,
            rgId: '',// ride.id.value,
            dId: nreg.dId.value,
            date: ride.date.value,
            fId: ride.fromLocation.value,
            tId: ride.toLocation.value,
            from: from,
            to: to,
            pass: nreg.seats.value,// ride.passengers(),
            isRegistered: true,// (registereds && registereds.length > 0),
            dFromHour: nreg.fromHour.value,
            dToHour: nreg.toHour.value,
            dPass: this.seats.value,
          };
          result.registered.push(row);
        }
      }
      else {
        if (ride.passengers() <= this.seats.value) {
          let row: ride4DriverRideRegister = {
            rId: ride.id.value,
            rgId: '',// ride.id.value,
            // dId: nreg.driverId.value,
            date: ride.date.value,
            fId: ride.fromLocation.value,
            tId: ride.toLocation.value,
            from: from,
            to: to,
            pass: ride.passengers(),
            dPass: this.seats.value,
            isRegistered: false,// (registereds && registereds.length > 0),
          };
          result.newregistered.push(row);
        }
      }



      // let row: ride4DriverRideRegister = {
      //   rId: ride.id.value,
      //   rgId: '',// ride.id.value,
      //   date: ride.date.value,
      //   fId: ride.fromLocation.value,
      //   tId: ride.toLocation.value,
      //   from: from,
      //   to: to,
      //   pass: ride.passengers(),
      //   isRegistered: false,
      // };
      // result.newregistered.push(row);
    }

    result.registered.sort((r1, r2) => r1.from.localeCompare(r2.from));
    result.newregistered.sort((r1, r2) => r1.from.localeCompare(r2.from));

    return result;
  }
}

@Component({
  selector: 'app-driver-register',
  templateUrl: './driver-register.component.html',
  styleUrls: ['./driver-register.component.scss']
})
export class DriverRegisterComponent implements OnInit {

  params = new driverRegister(this.context);

  driver: Driver;

  ridesToRegister: ride4DriverRideRegister[];
  rides: ride4DriverRideRegister[];

  clientLastRefreshDate: Date = new Date();
  demoDates: string;
  static lastRefreshDate: Date = new Date();//client time

  constructor(private context: Context, private dialog: DialogService) { }

  async prevDay() {
    this.params.date.value = addDays(-1, this.params.date.value);
    // console.log(this.params.date.value);
  }

  async nextDay() {
    this.params.date.value = addDays(+1, this.params.date.value);
    // console.log(this.params.date.value);
  }
  
  async ngOnInit() {

    // let date = new Date(2021, 2, 3);
    // this.selectedFrom = new LocationIdColumn({ caption: "From" }, this.context),
    //   this.selectedTo = new LocationIdColumn({ caption: "To" }, this.context);
    // this.selectedDate = new DateColumn({ caption: "Date", defaultValue: new Date(date.getFullYear(), date.getMonth(), date.getDate()) });
    // this.toolbar = new DataAreaSettings({
    //   columnSettings: () => [
    //     this.selectedDate, this.selectedFrom, this.selectedTo,
    //   ],
    // });
    this.driver = await this.context.for(Driver).findFirst({
      where: d => d.userId.isEqualTo(this.context.user.id),
    });
    if (!(this.driver)) {
      throw 'Error - You are not register to use app';
    }
    this.params.fid.value = this.driver.defaultFromLocation ? this.driver.defaultFromLocation.value : null;
    this.params.tid.value = this.driver.defaultToLocation ? this.driver.defaultToLocation.value : null;
    this.params.did.value = this.driver.id.value;
    this.params.seats.value = this.driver.seats.value;
    
    await this.refresh();
  }

  async refresh() {

    if (this.driver) {
      let changed = false;
      if (this.driver.defaultFromLocation.value != this.params.fid.value) {
        this.driver.defaultFromLocation.value = this.params.fid.value;
        changed = true;
      }
      if (this.driver.defaultToLocation.value != this.params.tid.value) {
        this.driver.defaultToLocation.value = this.params.tid.value;
        changed = true;
      }
      if (changed) {
        await this.driver.save();
      }
    }

    this.params.onChanged = async () => { };
    let result = await this.params.retrieveRideList4Usher();
    this.params.onChanged = async () => { await this.refresh(); };

    this.rides = result.registered;
    this.ridesToRegister = result.newregistered;

    this.clientLastRefreshDate = new Date();
  }

  // @ServerFunction({ allowed: Roles.driver })
  // static async retrieveDriverRegister(driverId: string, dSeats: number, date: Date, fid: string, tid: string, context?: Context) {
  //   date = new Date(2021, 2, 3);
  //   var result: {
  //     registered: ride4DriverRideRegister[],
  //     newregistered: ride4DriverRideRegister[]
  //   } = {
  //     registered: [],
  //     newregistered: []
  //   };

  //   let dLocs: string[] = [];
  //   for await (const pref of context.for(DriverPrefs).iterate({
  //     where: pf => pf.driverId.isEqualTo(driverId),
  //   })) {
  //     dLocs.push(pref.locationId.value);
  //   }

  //   for await (const reg of context.for(RegisterRide).iterate({//todo: display only records that not attach by usher
  //     where: rg => rg.date.isEqualTo(date),
  //     // .and(fid && (fid.trim().length > 0) ? rg.fromLoc.isEqualTo(fid) : rg.fromLoc.isIn(...dLocs))// new Filter(x => { /*true*/ }))
  //     // .and(tid && (tid.trim().length > 0) ? rg.toLoc.isEqualTo(tid) : rg.toLoc.isIn(...dLocs)),// new Filter(x => { /*true*/ })),
  //   })) {


  //     let isok = true;
  //     if ((fid && fid.length > 0) || (tid && tid.length > 0)) {
  //       if (fid && fid.length > 0) {
  //         if (!(reg.fromLoc.value == fid)) {
  //           isok = false;
  //         }
  //       }
  //       if (tid && tid.length > 0) {
  //         if (!(reg.toLoc.value == tid)) {
  //           isok = false;
  //         }
  //       }
  //     }
  //     else if (!(dLocs.includes(reg.fromLoc.value) || dLocs.includes(reg.toLoc.value))) {
  //       isok = false;
  //     }

  //     if (!(isok)) {
  //       continue;
  //     }

  //     let from = (await context.for(Location).findId(reg.fromLoc.value)).name.value;
  //     let to = (await context.for(Location).findId(reg.toLoc.value)).name.value;
  //     let registereds = (await context.for(RegisterDriver).find(
  //       {
  //         where: rg => rg.rgId.isEqualTo(reg.id)
  //           .and(rg.dId.isEqualTo(driverId)),
  //       }));

  //     if (registereds && registereds.length > 0) {
  //       for (const nreg of registereds) {
  //         let row: ride4DriverRideRegister = {
  //           rId: '',
  //           rgId: reg.id.value,
  //           dId: nreg.dId.value,
  //           date: reg.date.value,
  //           fId: reg.fromLoc.value,
  //           tId: reg.toLoc.value,
  //           from: from,
  //           to: to,
  //           pass: nreg.seats.value,
  //           isRegistered: true,// (registereds && registereds.length > 0),
  //           dFromHour: nreg.fromHour.value,
  //           dToHour: nreg.toHour.value,
  //           dPass: dSeats,
  //         };
  //         result.registered.push(row);
  //       }
  //     }
  //     else {
  //       if (reg.passengers.value <= dSeats) {
  //         let row: ride4DriverRideRegister = {
  //           rId: '',
  //           rgId: reg.id.value,
  //           // dId: nreg.driverId.value,
  //           date: reg.date.value,
  //           fId: reg.fromLoc.value,
  //           tId: reg.toLoc.value,
  //           from: from,
  //           to: to,
  //           pass: reg.passengers.value,
  //           isRegistered: false,// (registereds && registereds.length > 0),
  //           dPass: dSeats,
  //         };
  //         result.newregistered.push(row);
  //       }
  //     }
  //   }

  //   for await (const ride of context.for(Ride).iterate({//todo: display only records that not attach by usher
  //     where: r => r.date.isEqualTo(date)
  //       // .and(fid && (fid.trim().length > 0) ? r.fromLocation.isEqualTo(fid) : r.fromLocation.isIn(...dLocs))// new Filter(x => { /*true*/ }))
  //       // .and(tid && (tid.trim().length > 0) ? r.toLocation.isEqualTo(tid) : new Filter(x => { /*true*/ }))
  //       .and(r.status.isEqualTo(RideStatus.waitingForDriver)),
  //   })) {

  //     let isok = true;
  //     if ((fid && fid.length > 0) || (tid && tid.length > 0)) {
  //       if (fid && fid.length > 0) {
  //         if (!(ride.fromLocation.value == fid)) {
  //           isok = false;
  //         }
  //       }
  //       if (tid && tid.length > 0) {
  //         if (!(ride.toLocation.value == tid)) {
  //           isok = false;
  //         }
  //       }
  //     }
  //     else if (!(dLocs.includes(ride.fromLocation.value) || dLocs.includes(ride.toLocation.value))) {
  //       isok = false;
  //     }

  //     if (!(isok)) {
  //       continue;
  //     }

  //     let from = (await context.for(Location).findId(ride.fromLocation.value)).name.value;
  //     let to = (await context.for(Location).findId(ride.toLocation.value)).name.value;

  //     let registereds = (await context.for(RegisterDriver).find(
  //       {
  //         where: rg => rg.rId.isEqualTo(ride.id)
  //           .and(rg.dId.isEqualTo(driverId)),
  //       }));

  //     if (registereds && registereds.length > 0) {
  //       for (const nreg of registereds) {
  //         let row: ride4DriverRideRegister = {
  //           rId: ride.id.value,
  //           rgId: '',// ride.id.value,
  //           dId: nreg.dId.value,
  //           date: ride.date.value,
  //           fId: ride.fromLocation.value,
  //           tId: ride.toLocation.value,
  //           from: from,
  //           to: to,
  //           pass: nreg.seats.value,// ride.passengers(),
  //           isRegistered: true,// (registereds && registereds.length > 0),
  //           dFromHour: nreg.fromHour.value,
  //           dToHour: nreg.toHour.value,
  //           dPass: dSeats,
  //         };
  //         result.registered.push(row);
  //       }
  //     }
  //     else {
  //       if (ride.passengers() <= dSeats) {
  //         let row: ride4DriverRideRegister = {
  //           rId: ride.id.value,
  //           rgId: '',// ride.id.value,
  //           // dId: nreg.driverId.value,
  //           date: ride.date.value,
  //           fId: ride.fromLocation.value,
  //           tId: ride.toLocation.value,
  //           from: from,
  //           to: to,
  //           pass: ride.passengers(),
  //           dPass: dSeats,
  //           isRegistered: false,// (registereds && registereds.length > 0),
  //         };
  //         result.newregistered.push(row);
  //       }
  //     }



  //     // let row: ride4DriverRideRegister = {
  //     //   rId: ride.id.value,
  //     //   rgId: '',// ride.id.value,
  //     //   date: ride.date.value,
  //     //   fId: ride.fromLocation.value,
  //     //   tId: ride.toLocation.value,
  //     //   from: from,
  //     //   to: to,
  //     //   pass: ride.passengers(),
  //     //   isRegistered: false,
  //     // };
  //     // result.newregistered.push(row);
  //   }

  //   result.registered.sort((r1, r2) => r1.from.localeCompare(r2.from));
  //   result.newregistered.sort((r1, r2) => r1.from.localeCompare(r2.from));

  //   return result;
  // }

  async unregister(r: ride4DriverRideRegister) {
    let reg = undefined;
    if (r.rId && r.rId.length > 0) {
      reg = await this.context.for(RegisterDriver).findFirst({
        where: rd => rd.dId.isEqualTo(r.dId)
          .and(rd.rId.isEqualTo(r.rId)),
      });
    }
    else (r.rgId && r.rgId.length > 0)
    {
      reg = await this.context.for(RegisterDriver).findFirst({
        where: rd => rd.dId.isEqualTo(r.dId)
          .and(rd.rgId.isEqualTo(r.rgId)),
      });
    }

    if (await this.dialog.confirmDelete(`Your Registration (${r.from} to ${r.to} at ${formatDate(r.date, 'dd.MM.yyyy', 'en-US')})`)) {
      await reg.delete();
      await this.refresh();
    }
  }

  async register(r: ride4DriverRideRegister) {
    // let date = new Date(2021, 2, 3);
    let reg = this.context.for(RegisterDriver).create();
    reg.rId.value = r.rId;
    reg.rgId.value = r.rgId;
    reg.dId.value = this.driver.id.value;
    reg.fromHour.value = this.driver.defaultFromTime.value;// todo: r.date;
    reg.toHour.value = this.driver.defaultToTime.value;// todo: r.date;
    // reg.toHour.value = date;// todo: r.date;

    let seats = Math.min(r.pass, r.dPass);
    reg.seats.value = seats;

    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Register To Ride",
        columnSettings: () => [
          reg.fromHour,
          reg.toHour,
          reg.seats,
        ],
        ok: async () => {
          await reg.save();
          this.driver.defaultFromTime.value = reg.fromHour.value;
          this.driver.defaultToTime.value = reg.toHour.value;
          this.driver.defaultSeats.value = reg.seats.value;
          await this.driver.save();
          await this.refresh();
        }
      },
    );

  }

}
