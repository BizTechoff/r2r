import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, Filter, NumberColumn, ServerController, ServerMethod } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { PickupTimePrevHours, ride4DriverRideRegister, TimeColumn, TODAY } from '../../../shared/types';
import { addDays, addHours } from '../../../shared/utils';
import { Location, LocationArea, LocationIdColumn, LocationType } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';
import { Driver, DriverIdColumn } from '../driver';
import { DriverPrefs } from '../driverPrefs';
import { RegisterDriver } from './registerDriver';

export interface response {
  registered: ride4DriverRideRegister[],
  newregistered: ride4DriverRideRegister[],
};

@ServerController({ key: 'd/reg', allowed: true })
class driverRegister {//dataControlSettings: () => ({width: '150px'}), 
  date = new DateColumn({
    defaultValue: addDays(TODAY), valueChange: async () => {
      await this.onChanged();
    }
  });
  fid = new LocationIdColumn({ caption: 'From Location', valueChange: async () => { await this.onChanged(); } }, this.context);
  tid = new LocationIdColumn({ caption: 'To Location', valueChange: async () => { await this.onChanged(); } }, this.context);
  did = new DriverIdColumn({}, this.context);
  seats = new NumberColumn();
  constructor(private context: Context) { }
  ready = false;
  onChanged = async () => { };

  locAreas: { id: string, name: string, area: string[] }[] = [];
  @ServerMethod()
  async retrieve(): Promise<response> {//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    var result: response = {
      registered: [],
      newregistered: []
    } = { registered: [], newregistered: [] };

    // prepare kav & area
    let areasBorders: { area: LocationArea, lids: string[] }[] = []
    for await (const loc of this.context.for(Location).iterate({
    })) {
      if (loc.type.isEqualTo(LocationType.border)) {
        let a: { area: LocationArea, lids: string[] } =
          areasBorders.find(cur => cur.area == loc.area.value);
        if (!(a)) {
          a = { area: loc.area.value, lids: [] };
          areasBorders.push(a);
        }
        a.lids.push(loc.id.value);
      }
      else {
        let a = { area: loc.area.value, lids: [loc.id.value] };
        areasBorders.push(a);
      }
    }

    this.locAreas = [];
    for await (const loc of this.context.for(Location).iterate({
    })) {
      let isBorder = loc.type == LocationType.border;
      let row = {
        id: loc.id.value,
        name: loc.name.value,
        area: isBorder ? areasBorders.find(cur => cur.area == loc.area.value).lids : [loc.id.value]
      };
      this.locAreas.push(row);
    }

    let dPrefs: { lid: string, both: boolean }[] = [];
    for await (const dp of this.context.for(DriverPrefs).iterate({
      where: cur => cur.driverId.isEqualTo(this.did)
    })) {
      dPrefs.push({ lid: dp.locationId.value, both: dp.tBorder.value });
    }

    let dHistory: { fid: string, tid: string }[] = [];
    let dHistoryArea: { fids: string[], tids: string[] } = { fids: [], tids: [] };
    // let borderArea: { key: string }[] = [];
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.driverId.isEqualTo(this.did)
    })) {
      let kav = dHistory.find(cur => cur.fid === r.fid.value && cur.tid === r.tid.value);
      if (!(kav)) {
        kav = { fid: r.fid.value, tid: r.tid.value };
        dHistory.push(kav);
        let fa = this.getLocArea(kav.fid);
        let ta = this.getLocArea(kav.tid);
        dHistoryArea.fids.push(...fa);
        dHistoryArea.tids.push(...ta);
      }
    }

    /*
    areasBorders: area: LocationArea, lids: string[]
    locAreas:     id: string, name: string, area: string[]
    dPrefs:       lid: string, both: boolean
    dHistory:     fid: string, tid: string
    */

    // Register Rides
    for await (const rd of this.context.for(RegisterDriver).iterate({
      where: cur => cur.did.isEqualTo(this.did)
        .and(cur.date.isEqualTo(this.date))
    })) {

      if (rd.rid.value && rd.rid.value.length > 0) {
        let r = await this.context.for(Ride).findId(rd.rid.value);
        if (r) {
          let ok = false;
          if (this.fid.value && this.fid.value.length > 0 && this.tid.value && this.tid.value.length > 0) {
            if (r.fid.value === this.fid.value && r.tid.value === this.tid.value) {
              ok = true;
            }
          }
          else if (this.fid.value && this.fid.value.length > 0) {
            if (r.fid.value === this.fid.value) {
              ok = true;
            }
          }
          else if (this.tid.value && this.tid.value.length > 0) {
            if (r.tid.value === this.tid.value) {
              ok = true;
            }
          }
          else {
            ok = true;// no filter by this.fid/tid
          }

          if (ok) {
            let row: ride4DriverRideRegister = {
              rid: rd.rid.value,
              rrid: '',
              dId: this.did.value,
              date: rd.date.value,
              fId: r.fid.value,
              tId: r.tid.value,
              from: this.locAreas.find(cur => cur.id === r.fid.value).name,
              to: this.locAreas.find(cur => cur.id === r.tid.value).name,
              pass: r.passengers(),
              isRegistered: true,
              dFromHour: rd.fh.value,
              dToHour: rd.th.value,
              dPass: this.seats.value,
              pickupTime: r.pickupTime.value,
              dRemark: r.dRemark.value,
            }
            result.registered.push(row);
          }
        }
      }

      else if (rd.rrid.value && rd.rrid.value.length > 0) {
        let rr = await this.context.for(RegisterRide).findId(rd.rrid.value);
        if (rr) {
          let ok = false;
          if (this.fid.value && this.fid.value.length > 0 && this.tid.value && this.tid.value.length > 0) {
            if (rr.fid.value === this.fid.value && rr.tid.value === this.tid.value) {
              ok = true;
            }
          }
          else if (this.fid.value && this.fid.value.length > 0) {
            if (rr.fid.value === this.fid.value) {
              ok = true;
            }
          }
          else if (this.tid.value && this.tid.value.length > 0) {
            if (rr.tid.value === this.tid.value) {
              ok = true;
            }
          }
          else {
            ok = true;// no filter by this.fid/tid
          }

          if (ok) {
            let row: ride4DriverRideRegister = {
              rid: '',
              rrid: rd.rrid.value,
              dId: rd.did.value,
              date: rd.date.value,
              fId: rr.fid.value,
              tId: rr.tid.value,
              from: this.locAreas.find(cur => cur.id === rr.fid.value).name,
              to: this.locAreas.find(cur => cur.id === rr.tid.value).name,
              pass: 0,
              isRegistered: true,
              dFromHour: rd.fh.value,
              dToHour: rd.th.value,
              dPass: this.seats.value,
              pickupTime: addHours(PickupTimePrevHours, rr.visitTime.value),
              dRemark: rr.remark.value,
            }
            result.registered.push(row);
          }
        }
      }
    }

    /*
    areasBorders: area: LocationArea, lids: string[]
    locAreas:     id: string, name: string, area: string[]
    dPrefs:       lid: string, both: boolean
    dHistory:     fid: string, tid: string
    */

    // Suggest Register from Rides
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.date.isEqualTo(this.date)
        .and(cur.id.isNotIn(...result.registered.map(i => i.rid)))
        .and(cur.status.isIn(...[RideStatus.waitingForAccept, RideStatus.waitingForDriver]))
        .and(
          this.fid.value && this.fid.value.length > 0 && this.tid.value && this.tid.value.length > 0//this fid&tid
            ? cur.fid.isEqualTo(this.fid).and(cur.tid.isEqualTo(this.tid))
            : this.fid.value && this.fid.value.length > 0//this fid
              ? cur.fid.isEqualTo(this.fid)
              : this.tid.value && this.tid.value.length > 0//this tid
                ? cur.tid.isEqualTo(this.tid)
                : new Filter(f => { return true; })
        )
    })) {

      let pref = dPrefs.find(cur => cur.lid === r.fid.value || cur.lid === r.tid.value);
      let matchPrefs = pref ? true : false;

      let kavHistory = dHistory.find(cur => cur.fid === r.fid.value && cur.tid === r.tid.value);
      let matchKavHistory = kavHistory ? true : false;

      let areaFHistory = dHistory.find(cur => this.getLocArea(r.fid.value).includes(cur.fid));// && cur.tid === rr.tid.value);
      let matchFAreaHistory = areaFHistory ? true : false;

      let areaTHistory = dHistory.find(cur => this.getLocArea(r.tid.value).includes(cur.tid));// && cur.fid === rr.fid.value);
      let matchTAreaHistory = areaTHistory ? true : false;

      if (matchPrefs || matchKavHistory || matchFAreaHistory || matchTAreaHistory) {


        let row: ride4DriverRideRegister = {
          rid: r.id.value,
          rrid: '',
          dId: this.did.value,
          date: r.date.value,
          fId: r.fid.value,
          tId: r.tid.value,
          from: this.locAreas.find(cur => cur.id === r.fid.value).name,
          to: this.locAreas.find(cur => cur.id === r.tid.value).name,
          pass: r.passengers(),
          isRegistered: false,
          dFromHour: '',
          dToHour: '',
          dPass: this.seats.value,
          pickupTime: r.pickupTime.value,
          dRemark: r.dRemark.value,
          reason: matchPrefs ? 'By Prefs' : matchKavHistory ? `By Kav History` : matchFAreaHistory ? 'By Area(f) History' : matchTAreaHistory ? 'By Area(t) History' : ''
        }
        result.newregistered.push(row);
      }
    }

    // Suggest Register from RegisterRide    
    for await (const rr of this.context.for(RegisterRide).iterate({
      where: cur => cur.fdate.isLessOrEqualTo(this.date)
        .and(cur.tdate.isGreaterOrEqualTo(this.date))
        .and(cur.id.isNotIn(...result.registered.map(i => i.rrid)))
        .and(
          this.fid.value && this.fid.value.length > 0 && this.tid.value && this.tid.value.length > 0//this fid&tid
            ? cur.fid.isEqualTo(this.fid).and(cur.tid.isEqualTo(this.tid))
            : this.fid.value && this.fid.value.length > 0//this fid
              ? cur.fid.isEqualTo(this.fid)
              : this.tid.value && this.tid.value.length > 0//this tid
                ? cur.tid.isEqualTo(this.tid)
                : new Filter(f => { return true; }))
    })) {

      if (rr.isOneOdDayWeekSelected()) {
        let ok = false;
        ok = ok || (rr.sunday.value && this.date.getDayOfWeek() == 0);
        ok = ok || (rr.monday.value && this.date.getDayOfWeek() == 1);
        ok = ok || (rr.tuesday.value && this.date.getDayOfWeek() == 2);
        ok = ok || (rr.wednesday.value && this.date.getDayOfWeek() == 3);
        ok = ok || (rr.thursday.value && this.date.getDayOfWeek() == 4);
        ok = ok || (rr.friday.value && this.date.getDayOfWeek() == 5);
        ok = ok || (rr.saturday.value && this.date.getDayOfWeek() == 6);
        if (!(ok)) {
          continue;
        }
      }

      let pref = dPrefs.find(cur => cur.lid === rr.fid.value || cur.lid === rr.tid.value);
      let matchPrefs = pref ? true : false;

      let kavHistory = dHistory.find(cur => cur.fid === rr.fid.value && cur.tid === rr.tid.value);
      let matchKavHistory = kavHistory ? true : false;

      let areaFHistory = dHistory.find(cur => this.getLocArea(rr.fid.value).includes(cur.fid));// && cur.tid === rr.tid.value);
      let matchFAreaHistory = areaFHistory ? true : false;

      let areaTHistory = dHistory.find(cur => this.getLocArea(rr.tid.value).includes(cur.tid));// && cur.fid === rr.fid.value);
      let matchTAreaHistory = areaTHistory ? true : false;

      if (matchPrefs || matchKavHistory || matchFAreaHistory || matchTAreaHistory) {

        let row: ride4DriverRideRegister = {
          rid: '',
          rrid: rr.id.value,
          dId: this.did.value,
          date: this.date.value,
          fId: rr.fid.value,
          tId: rr.tid.value,
          from: this.locAreas.find(cur => cur.id === rr.fid.value).name,
          to: this.locAreas.find(cur => cur.id === rr.tid.value).name,
          pass: 0,
          isRegistered: false,
          // dFromHour: nreg.fh.value,
          // dToHour: nreg.th.value,
          dPass: this.seats.value,
          pickupTime: addHours(PickupTimePrevHours, rr.visitTime.value),
          dRemark: rr.remark.value,
          reason: matchPrefs ? 'By Prefs' : matchKavHistory ? `By Kav History` : matchFAreaHistory ? 'By Area(f) History' : matchTAreaHistory ? 'By Area(t) History' : ''
        };
        result.newregistered.push(row);
      }
    }

    result.registered.sort((r1, r2) => r1.from.localeCompare(r2.from));
    result.newregistered.sort((r1, r2) => r1.from.localeCompare(r2.from));
    return result;
  }

  getLocsArea(lids: string[]): string[] {
    let result: string[] = [];
    for (const l of lids) {
      let f = this.locAreas.find(cur => cur.id === l);
      if (f) {
        result.push(...f.area);
      }
    }
    return result;
  }

  getLocArea(lid: string): string[] {
    let f = this.locAreas.find(cur => cur.id === lid);
    if (f) {
      return f.area;
    }
    return [];
  }

  async createRide4DriverRideRegister(ride: Ride, from: string, to: string): Promise<ride4DriverRideRegister> {
    let result: ride4DriverRideRegister = {
      rid: ride.id.value,
      rrid: '',// ride.id.value,
      // dId: nreg.driverId.value,
      date: ride.date.value,
      fId: ride.fid.value,
      tId: ride.tid.value,
      from: from,
      to: to,
      pass: ride.passengers(),
      dPass: this.seats.value,
      isRegistered: false,// (registereds && registereds.length > 0),
      pickupTime: ride.pickupTime.value,
      dRemark: ride.dRemark.value,
    };
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
  todayMidnigth = addDays(TODAY);

  constructor(private context: Context, private dialog: DialogService) { }

  async prevDay() {
    this.params.date.value = addDays(-1, this.params.date.value);
  }

  async nextDay() {
    this.params.date.value = addDays(+1, this.params.date.value);
  }

  async ngOnInit() {
    this.driver = await this.context.for(Driver).findFirst({
      where: d => d.userId.isEqualTo(this.context.user.id),
    });
    if (!(this.driver)) {
      throw 'Error - You are not register to use app';
    }
    // this.todayMidnigth = new Date(this.todayMidnigth.getFullYear(), this.todayMidnigth.getMonth(), this.todayMidnigth.getDate());

    this.params.fid.value = this.driver.defaultFromLocation ? this.driver.defaultFromLocation.value : null;
    this.params.tid.value = this.driver.defaultToLocation ? this.driver.defaultToLocation.value : null;
    this.params.did.value = this.driver.id.value;
    this.params.seats.value = this.driver.seats.value;

    await this.refresh();
  }

  retrieving = false;
  async refresh() {
    if (!(this.retrieving)) {
      this.retrieving = true;
      try {
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

        this.params.onChanged = async () => { };
        let result = await this.params.retrieve();
        this.params.onChanged = async () => { await this.refresh(); };

        this.rides = result.registered;
        this.ridesToRegister = result.newregistered;

        this.clientLastRefreshDate = new Date();
      } finally {
        this.retrieving = false;
      }
    }
  }

  async unregister(r: ride4DriverRideRegister) {
    let reg: RegisterDriver;
    let yes = await this.dialog.confirmDelete(`Your Registration (${r.from} to ${r.to} at ${formatDate(r.date, 'dd.MM.yyyy', 'en-US')})`);
    if (yes) {
      if (r.rid && r.rid.length > 0) {
        reg = await this.context.for(RegisterDriver).findFirst({
          where: rd => rd.did.isEqualTo(r.dId)
            .and(rd.rid.isEqualTo(r.rid)),
        });
      }
      else if (r.rrid && r.rrid.length > 0) {// driver migth register to both rrid && rid// todo: filter what driver can register to.
        reg = await this.context.for(RegisterDriver).findFirst({
          where: rd => rd.did.isEqualTo(r.dId)
            .and(rd.rrid.isEqualTo(r.rrid)),
        });
      }
      if (reg) {
        await reg.delete();
        await this.updateRegisterRides(reg.rrid.value, -1);
        await this.refresh();
      }
    }
  }

  async register(r: ride4DriverRideRegister) {
    // let date = new Date(2021, 2, 3);
    let reg = this.context.for(RegisterDriver).create();
    reg.date.value = this.params.date.value;
    reg.rrid.value = r.rrid;
    reg.rid.value = r.rid;
    reg.did.value = this.driver.id.value;
    reg.fh.value = r.pickupTime ? addHours(-1, r.pickupTime) : this.driver.defaultFromTime.value;// todo: r.date;
    reg.th.value = r.pickupTime ? addHours(+1, r.pickupTime) : this.driver.defaultToTime.value;// todo: r.date;
    // reg.toHour.value = date;// todo: r.date;

    let seats = r.dPass;// Math.min(r.pass, r.dPass);
    reg.seats.value = seats;

    let f = await this.context.for(Location).findId(r.fId);
    let from = f.name.value;
    let fCaption = `Pickup From ${from}`;
    let tCaption = 'Pickup Till';
    let fReadonly = false;
    let tReadonly = false;
    if (f.type.value === LocationType.border) {
      reg.fh.value = TimeColumn.Empty;
      fCaption = `I Can Be At ${from} About`;
      fReadonly = false;
      tCaption = 'Max Pickup Time';
      tReadonly = true;
    }
    else {
      reg.fh.value = formatDate(new Date(), 'HH:mm', 'en-US');
      reg.th.value = '22:00';
      fCaption = 'I Can Be There ASAP';
      fReadonly = true;
      tCaption = 'Max Pickup Time';
      tReadonly = false;
    }

    await this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Register To Ride",
        columnSettings: () => [
          { column: reg.fh, caption: fCaption, readOnly: fReadonly },
          { column: reg.th, caption: tCaption, readOnly: tReadonly },
          reg.seats,
        ],
        validate: async () => {
          console.log(reg.fh.value);
          if (!(reg.isHasFromHour())) {
            reg.fh.validationError = 'Required';
            throw reg.fh.defs.caption + ' ' + reg.fh.validationError;
          }
          if (!(reg.isHasToHour())) {
            reg.th.validationError = 'Required';
            throw reg.th.defs.caption + ' ' + reg.th.validationError;
          }
        },
        ok: async () => {
          await reg.save();
          this.driver.defaultFromTime.value = reg.fh.value;
          this.driver.defaultToTime.value = reg.th.value;
          await this.driver.save();
          await this.updateRegisterRides(reg.rrid.value, 1);
          await this.refresh();
        }
      },
    );

  }

  async updateRegisterRides(rrid: string, add: number) {
    let rr = await this.context.for(RegisterRide).findId(rrid);
    if (rr) {
      rr.dCount.value = rr.dCount.value + add;
      await rr.save();
    }
  }

}
