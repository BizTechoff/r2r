import { Component, OnInit } from '@angular/core';
import { BoolColumn, Context, DateColumn, Filter, NumberColumn, ServerController, ServerFunction } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { PickupTimePrevHours, ride4UsherRideRegister, TimeColumn, TODAY } from '../../../shared/types';
import { addDays, addHours } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { RegisterDriver } from '../../drivers/registerDriver';
import { Location, LocationIdColumn, LocationType } from '../../locations/location';
import { RegisterRide } from './registerRide';


// @EntityClass
@ServerController({ key: 'u/reg', allowed: [Roles.admin] })//mabatParams
class registerRidesProviderParams {//componentParams
  date = new DateColumn({ defaultValue: addDays(TODAY), valueChange: async () => await this.onChanged() });//, dataControlSettings: () => ({cssClass: () => {return 'todaySelected';} })
  fid?= new LocationIdColumn({ caption: 'From Location', defaultValue: null, allowNull: true }, this.context);
  tid?= new LocationIdColumn({ caption: 'To Location', defaultValue: null, allowNull: true }, this.context);
  onChanged: () => void;
  constructor(private context: Context, onChanged: () => void) {
    this.onChanged = onChanged;
  }
}

@Component({
  selector: 'app-register-rides',
  templateUrl: './register-rides.component.html',
  styleUrls: ['./register-rides.component.scss']
})
export class RegisterRidesComponent implements OnInit {

  trueFilter = new Filter((f) => { return true });
  all = new BoolColumn({ caption: 'Show All', defaultValue: false, valueChange: async () => { await this.refresh(); } });
  params = new registerRidesProviderParams(this.context, async () => await this.refresh());
  ridesCount = new NumberColumn({ caption: 'Total Rides' });
  registerSettings = this.context.for(RegisterRide).gridSettings({
    where: cur =>
      this.all.value ? new Filter(f => { return true; }) : (cur.fdate.isLessOrEqualTo(this.params.date)
        .and(cur.tdate.isGreaterOrEqualTo(this.params.date)))
        .and(this.params.fid.value ? cur.fid.isEqualTo(this.params.fid) : this.trueFilter)
        .and(this.params.tid.value ? cur.tid.isEqualTo(this.params.tid) : this.trueFilter),
    orderBy: cur => [{ column: cur.fid, descending: false }, { column: cur.tid, descending: false }, { column: cur.fdate, descending: false }, { column: cur.tdate, descending: false }, { column: cur.visitTime, descending: false }],
    // allowCRUD:this.context.isAllowed(Roles.admin),
    allowSelection: true,
    numOfColumnsInGrid: 20,
    columnSettings: (cur) => [
      cur.fid,
      cur.tid,
      cur.visitTime,
      cur.pickupTime,
      cur.fdate,
      cur.tdate,
      { column: cur.dCount, caption: 'Registered Drivers', cssClass: 'registerDrivers', clickIcon: 'people', click: async (rr) => { await this.openRegisteredDrivers(rr) } },
      cur.remark,
      // {
      //   column: this.ridesCount,
      //   getValue: r => {
      //     let diff = this.getDateDiff(r.fdate, r.tdate);

      //     let oneDaySelected = r.sunday.value || r.monday.value || r.tuesday.value || r.wednesday.value || r.thursday.value || r.friday.value || r.saturday.value;
      //     if (!(oneDaySelected)) {
      //       return diff;
      //     }
      //     else {
      //       let couter = 0;
      //       for (let days = 0; days < diff; ++days) {
      //         const date = addDays(days, r.fdate.value);
      //         let dayOfWeek = date.getDay();
      //         if (r.sunday.value) {
      //           if (dayOfWeek == 0) {
      //             ++couter;
      //           }
      //         }
      //         if (r.monday.value) {
      //           if (dayOfWeek == 1) {
      //             ++couter;
      //           }
      //         }
      //         if (r.tuesday.value) {
      //           if (dayOfWeek == 2) {
      //             ++couter;
      //           }
      //         }
      //         if (r.wednesday.value) {
      //           if (dayOfWeek == 3) {
      //             ++couter;
      //           }
      //         }
      //         if (r.thursday.value) {
      //           if (dayOfWeek == 4) {
      //             ++couter;
      //           }
      //         }
      //         if (r.friday.value) {
      //           if (dayOfWeek == 5) {
      //             ++couter;
      //           }
      //         }
      //         if (r.saturday.value) {
      //           if (dayOfWeek == 6) {
      //             ++couter;
      //           }
      //         }
      //       }
      //       return couter;
      //     }
      //   }
      // },
      { column: cur.sunday, caption: '1', width: '10', readOnly: true },
      { column: cur.monday, caption: '2', width: '10', readOnly: true },
      { column: cur.tuesday, caption: '3', width: '10', readOnly: true },
      { column: cur.wednesday, caption: '4', width: '10', readOnly: true },
      { column: cur.thursday, caption: '5', width: '10', readOnly: true },
      { column: cur.friday, caption: '6', width: '10', readOnly: true },
      { column: cur.saturday, caption: '7', width: '10', readOnly: true },
    ],
    rowButtons: [
      {
        textInMenu: 'Registered Drivers',
        icon: 'people',
        click: async (cur) => { await this.openRegisteredDrivers(cur); },
        visible: cur => cur.dCount.value > 0
      }
    ],
  });

  rides: ride4UsherRideRegister[];
  clientLastRefreshDate: Date = addDays(TODAY, undefined, false);
  registerRidesCount = 0;
  selectedCount = 0;

  constructor(private context: Context, private dialog: DialogService) { }

  async ngOnInit() {
  }

  async refresh() {
    await this.registerSettings.reloadData();
    this.clientLastRefreshDate = addDays(TODAY, undefined, false);
  }

  @ServerFunction({ allowed: [Roles.admin] })
  static async retrieveRegisterRides(context?: Context) {
    var result: ride4UsherRideRegister[] = [];

    for await (const rr of context.for(RegisterRide).iterate({
    })) {
      let from = (await context.for(Location).findId(rr.fid)).name.value;
      let to = (await context.for(Location).findId(rr.tid)).name.value;
      let registeredCount = (await context.for(RegisterDriver).count(
        cur => cur.rrid.isEqualTo(rr.id),
      ));

      let row: ride4UsherRideRegister = {
        rgId: rr.id.value,
        date: rr.fdate.value,
        fId: rr.fid.value,
        tId: rr.tid.value,
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

  async openRegisteredDrivers(rr: RegisterRide) {
    let from = (await this.context.for(Location).findId(rr.fid.value)).name.value;
    let to = (await this.context.for(Location).findId(rr.tid.value)).name.value;
    await this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `Registered Drivers For ${from}-${to}`,
      settings: this.context.for(RegisterDriver).gridSettings({
        where: cur => cur.rrid.isEqualTo(rr.id),
        orderBy: cur => [{ column: cur.did, descending: false }],
        allowCRUD: false,
        allowDelete: false,
        numOfColumnsInGrid: 10,
        columnSettings: cur => [
          cur.did,
          cur.fh,
          cur.th,
          cur.seats
        ],
      })
    });
  }

  async openAddRegisterRide() {

    let reg = this.context.for(RegisterRide).create();
    reg.fdate.value = addDays(TODAY);
    reg.tdate.value = addDays(-1, new Date(reg.fdate.value.getFullYear(), reg.fdate.value.getMonth() + 1, 1));
    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "New Registeration",
        columnSettings: () => [
          reg.fid, reg.tid,
          // reg.passengers,
          reg.fdate, reg.tdate,
          [reg.sunday, reg.monday, reg.tuesday],
          [reg.wednesday, reg.thursday, reg.friday],
          reg.saturday,
          {
            column: reg.visitTime,
            visible: () => {
              let v = reg.fid.selected && reg.fid.selected.type.value === LocationType.border;
              return v;
            }
          },
          {
            column: reg.pickupTime,
            visible: () => {
              let v = reg.fid.selected && reg.fid.selected.type.value === LocationType.hospital;
              return v;
            }
          },
          reg.remark,
        ],
        validate: async () => {
          let hospital = reg.fid.selected && reg.fid.selected.type.value === LocationType.hospital;
          let border = reg.fid.selected && reg.fid.selected.type.value === LocationType.border;
          if (!hospital) {
            if (!reg.visitTime.isEmpty()) {
              reg.pickupTime.value = addHours(PickupTimePrevHours, reg.visitTime.value);
            }
          }
          else if (!border) {
            reg.visitTime.value = TimeColumn.Empty;
          }
          if (await this.foundConflicts(reg)) {
            throw 'Found Conflicts';
            //await this.dialog.error( 'Found Conflicts' );
          }
        },
        ok: async () => {
          await reg.save();
          if (this.params.date.value == reg.fdate.value) {
            await this.refresh();
          }
          else {
            this.params.date.value = reg.fdate.value;//auto-refresh-onchanged
          }
        }
      },
    );
  }

  async foundConflicts(check: RegisterRide) {
    let count = await this.context.for(RegisterRide).count(
      // where: cur => cur.fdate.isGreaterThan(check.tdate).or(cur.tdate.isLessOrEqualTo(check.fdate))//no conflict
      cur => cur.fdate.isLessOrEqualTo(check.tdate).and(cur.tdate.isGreaterOrEqualTo(check.fdate))//conflict
        .and(cur.fid.isEqualTo(check.fid).and(cur.tid.isEqualTo(check.tid))));
    return count > 0;
  }

  async deleteSelected() {
    let canDelete = true;
    for (const reg of this.registerSettings.selectedRows) {
      if (reg.dCount.value > 0) {
        canDelete = false;
        break;
      }
    }
    if (!(canDelete)) {
      await this.dialog.error(`Can NOT delete where drivers registered`);
      return;
    }
    let message = `${this.registerSettings.selectedRows.length} ${this.registerSettings.selectedRows.length == 1 ? 'row' : 'rows'}`;
    let yes = await this.dialog.confirmDelete(message);
    if (yes) {
      let count = 0;
      for (const reg of this.registerSettings.selectedRows) {
        await reg.delete();
        ++count;
      }
      if (count > 0) {
        await this.refresh();
      }
    }
  }

  getDateDiff(fdate: DateColumn, tdate: DateColumn): number {
    if (fdate && tdate && fdate.value && tdate.value) {
      let diff = +tdate.value - +fdate.value;
      let days = (Math.ceil(diff / 1000 / 60 / 60 / 24) + 1);
      return days;
    }
    return 0;
  }

  async prevDay() {
    this.params.date.value = addDays(-1, this.params.date.value);
  }

  async nextDay() {
    this.params.date.value = addDays(+1, this.params.date.value);
  }

}

