import { Component, OnInit } from '@angular/core';
import { Context, NumberColumn, ServerFunction, StringColumn } from '@remult/core';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { ride4UsherRideRegister } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { RegisterDriver } from '../../drivers/driver-register/registerDriver';
import { Location } from '../../locations/location';
import { addDays } from '../../usher/usher';
import { RegisterRide } from './registerRide';

@Component({
  selector: 'app-register-rides',
  templateUrl: './register-rides.component.html',
  styleUrls: ['./register-rides.component.scss']
})
export class RegisterRidesComponent implements OnInit {

  days = new StringColumn({ caption: 'Days' })
  registerSettings = this.context.for(RegisterRide).gridSettings({
    orderBy: cur => [{ column: cur.fdate, descending: false }, { column: cur.fid, descending: false },],
    allowSelection: true,
    numOfColumnsInGrid: 10,
    columnSettings: (cur) => [
      cur.fid,
      cur.tid,
      cur.fdate,
      cur.tdate,
      { 
        column: this.days,
        getValue: (r) => {
          return '|' +
            r.sunday && r.sunday.value ? 'sun' + '|' : '' +
              r.monday && r.monday.value ? 'mon' + '|' : '' +
                r.tuesday && r.tuesday.value ? 'tue' + '|' : '' +
                  r.wednesday && r.wednesday.value ? 'wed' + '|' : '' +
                    r.thursday && r.thursday.value ? 'thu' + '|' : '' +
                      r.friday && r.friday.value ? 'fri' + '|' : '';
        }
      },
      // cur.sunday,
      // cur.monday,
      // cur.tuesday,
      // cur.wednesday,
      // cur.thursday,
      // cur.friday,
      // cur.passengers,
      cur.dCount,
      // {
      //   column: this.count,
      // getValue: async r => {
      //   let count = (await this.context.for(RegisterDriver).count(
      //     regD => regD.regRideId.isEqualTo(regR.id)));
      //   return count;
      // },
      // },
    ],
  });

  rides: ride4UsherRideRegister[];
  clientLastRefreshDate: Date = new Date();
  demoDates: string;
  lastRefreshDate: Date = new Date();//client time
  registerRidesCount = 0;
  selectedCount = 0;

  constructor(private context: Context) { }

  async ngOnInit() {
    // await this.refresh();
    // this.registerSettings = this.context.for(RegisterRide).gridSettings({
    //   numOfColumnsInGrid: 10,
    //   columnSettings: (reg) => [
    //     reg.date,
    //     reg.fromLoc,
    //     reg.toLoc,
    //     reg.passengers,
    //     {
    //       caption: 'registeredCount',
    //       column: new NumberColumn({}),
    //       getValue: async r => {
    //         (await this.context.for(RegisterDriver).count(
    //           rg => rg.regRideId.isEqualTo(reg.id)));},
    //     }
    //   ],
    // });
  }

  async refresh() {
    this.clientLastRefreshDate = new Date();
    this.registerSettings.reloadData();
    // this.rides = await RegisterRidesComponent.retrieveRegisterRides(this.context);
    // this.lastRefreshDate = new Date();
  }

  @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
  static async retrieveRegisterRides(context?: Context) {
    var result: ride4UsherRideRegister[] = [];

    for await (const reg of context.for(RegisterRide).iterate({
    })) {
      let from = (await context.for(Location).findId(reg.fid)).name.value;
      let to = (await context.for(Location).findId(reg.tid)).name.value;
      let registeredCount = (await context.for(RegisterDriver).count(
        rg => rg.rdId.isEqualTo(reg.id),
      ));

      let row: ride4UsherRideRegister = {
        rgId: reg.id.value,
        date: reg.fdate.value,
        fId: reg.fid.value,
        tId: reg.tid.value,
        from: from,
        to: to,
        // pass: reg.passengers.value,
        registeredCount: registeredCount,
        selected: false,
      };
      result.push(row);
    }

    result.sort((r1, r2) => +r1.date - +r2.date);

    return result;
  }

  async openAddRegisterRide() {

    let reg = this.context.for(RegisterRide).create();
    reg.fdate.value = new Date();
    reg.tdate.value = addDays(-1, new Date(reg.fdate.value.getFullYear(), reg.fdate.value.getMonth() + 1, 1));
    // let toDate = new DateColumn({ defaultValue: new Date() });
    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Register Ride(s)",
        columnSettings: () => [
          reg.fid, reg.tid,
          // reg.passengers,
          reg.fdate, reg.tdate,
          [reg.sunday, reg.monday, reg.tuesday],
          [reg.wednesday, reg.thursday, reg.friday],
          // [reg.saturday],
        ],
        ok: async () => {
          await reg.save();
          // await this.openHowMany(reg, toDate.value);
        }
      },
    );
  }

  private async openHowMany(reg: RegisterRide, toDate: Date) {

    let diff = 1 + Math.floor((+toDate - +reg.fdate.value) / (1000 * 60 * 60 * 24));

    let count = new NumberColumn({
      defaultValue: 5,
      validate: () => {
        if (count.value < 1) {
          count.validationError = " Count at least one";
        }
      },
      valueChange: () => { count.value > 0 ? this.registerRidesCount = count.value * diff : 0 },
    });
    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: `How many Ride(s) to create for each day (${diff} days)`,
        helpText: `${diff}(days) * ${count.value}(times) = ${this.registerRidesCount}(rides to create)`,
        columnSettings: () => [
          count,
        ],
        ok: async () => {

          for (let i = 0; i < diff; ++i) {
            let date = reg.fdate.value;
            date.setDate(date.getDate() + i);
            for (let i = 0; i < count.value; ++i) {
              let newReg = this.context.for(RegisterRide).create();
              newReg.fdate.value = date;
              newReg.fid.value = reg.fid.value;
              newReg.tid.value = reg.tid.value;
              // newReg.passengers.value = reg.passengers.value;
              await newReg.save();
            }
          }

          await this.refresh();
        },
      });
  }

  // onSelection() {
  //   this.selectedCount = 0;
  //   for (const r of this.rides) {
  //     if (r.selected) {
  //       ++this.selectedCount;
  //     }
  //   }
  //   console.log("sc: " + this.selectedCount);
  // }

  async deleteSelected() {

    for (const reg of this.registerSettings.selectedRows) {
      await reg.delete();
    }
    await this.refresh();
    // let p = new PromiseThrottle(this.selectedCount);

    // for (let i = this.rides.length -1; i >= 0; --i) {
    //   const r = this.rides[i];
    //   if(r.selected){
    //     let ride = await this.context.for(RegisterRide).findId(r.rgId);
    //     await ride.delete();
    //     this.rides.splice(
    //       this.rides.indexOf(r),
    //       1,
    //     );
    //   }
    // }
    // await p.done();
  }

}
