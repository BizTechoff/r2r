import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, Filter, NumberColumn, ServerController, ServerMethod } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { MaxPickupHospital, PickupTimePrevHours, ride4DriverRideRegister, TimeColumn, TODAY } from '../../../shared/types';
import { addDays, addHours } from '../../../shared/utils';
import { Location, LocationArea, LocationIdColumn, LocationType } from '../../locations/location';
import { RegisterRide } from '../../rides/register-rides/registerRide';
import { Ride, RideStatus } from '../../rides/ride';
import { Driver, DriverIdColumn } from '../driver';
import { DriverPrefs } from '../driverPrefs';
import { RegisterDriver } from '../registerDriver';

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
  fid = new LocationIdColumn(this.context, { caption: 'From Location', valueChange: async () => { await this.onChanged(); } });
  tid = new LocationIdColumn(this.context, { caption: 'To Location', valueChange: async () => { await this.onChanged(); } });
  fh = new TimeColumn({ caption: `I can From` });
  th = new TimeColumn({ caption: 'Till Hour' });
  did = new DriverIdColumn({}, this.context);
  seats = new NumberColumn();
  constructor(private context: Context) { }
  ready = false;
  onChanged = async () => { };

  locAreas: { id: string, name: string, isBorder: boolean, area: string[] }[] = [];
  @ServerMethod()
  async retrieve(): Promise<response> {
    var result: response = {
      registered: [],
      newregistered: []
    } = { registered: [], newregistered: [] };

    // prepare line & area
    let areasBorders: { area: LocationArea, lids: string[] }[] = []
    for await (const loc of this.context.for(Location).iterate({
    })) {
      if (loc.type.value === LocationType.border) {
        let a: { area: LocationArea, lids: string[] } =
          areasBorders.find(cur => cur.area === loc.area.value);
        if (!(a)) {
          a = { area: loc.area.value, lids: [] };
          areasBorders.push(a);
        }
        a.lids.push(loc.id.value);
      }
    }

    this.locAreas = [];// {border->{border.area.lids}}, {hospital->hospital}
    for await (const loc of this.context.for(Location).iterate({
    })) {
      let f = areasBorders.find(cur => cur.area === loc.area.value);
      let row = {
        id: loc.id.value,
        name: loc.name.value,
        isBorder: loc.type.value === LocationType.border,
        area: f ? f.lids : [loc.id.value]
      };
      this.locAreas.push(row);
    }

    let dPrefs: { lid: string }[] = [];
    for await (const dp of this.context.for(DriverPrefs).iterate({
      where: cur => cur.did.isEqualTo(this.did)
    })) {
      dPrefs.push({ lid: dp.lid.value });
    }

    let dHistory: { fid: string, tid: string }[] = [];
    let dHistoryArea: { fids: string[], tids: string[] } = { fids: [], tids: [] };
    // let borderArea: { key: string }[] = [];
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.did.isEqualTo(this.did)
    })) {
      let line = dHistory.find(cur => cur.fid === r.fid.value && cur.tid === r.tid.value);
      if (!(line)) {
        line = { fid: r.fid.value, tid: r.tid.value };
        dHistory.push(line);
        let fa = this.getLocArea(line.fid);
        let ta = this.getLocArea(line.tid);
        dHistoryArea.fids.push(...fa);
        dHistoryArea.tids.push(...ta);
      }
    }

    /*
    areasBorders: area: LocationArea, lids: string[]
    locAreas:     id:   string, name: string, area: string[]
    dPrefs:       lid:  string, both: boolean
    dHistory:     fid:  string, tid:  string
    dHistoryArea: fids: string, tids: string
    */

    // Register Rides
    for await (const rd of this.context.for(RegisterDriver).iterate({
      where: cur => cur.did.isEqualTo(this.did)
        .and(cur.date.isEqualTo(this.date))
    })) {

      if (rd.hasRideId()) {
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
              visitTime: r.visitTime.value,
              dRemark: r.dRemark.value,
              whenPickup: this.setWhenPickupRide(r),
              immediate: r.immediate.value
            }
            result.registered.push(row);
          }
        }
      }

      else if (rd.hasRideRegisterId()) {
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

          let isBorder = this.locAreas.find(cur => cur.id === rr.fid.value).isBorder;
          let immediate = isBorder && rr.visitTime.isEmpty() || !isBorder && rr.pickupTime.isEmpty();

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
              dRemark: rr.remark.value,
              pickupTime: rr.pickupTime.value,
              visitTime: rr.visitTime.value,
              whenPickup: this.setWhenPickupRegisterRide(rr),
              immediate: immediate
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
        .and(cur.status.isIn(...RideStatus.isDriverNotStarted))
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

      if (!(this.fh.isEmpty && this.th.isEmpty())) {
        if (this.fh.value > this.th.value) {
          this.th.value = this.fh.value;
        }
        if (!r.pickupTime.isEmpty()) {//!immediate
          let isBorder = this.locAreas.find(cur => cur.id === r.fid.value).isBorder;
          if (isBorder) {
            if (!(this.fh.value <= r.pickupTime.value)) {
              //if (r.pickupTime.value < this.th.value) {
              continue;
            }
          }
          else{
            if (!(this.fh.value <= r.pickupTime.value && r.pickupTime.value <= this.th.value)) {
              //if (r.pickupTime.value < this.th.value) {
              continue;
            }
          }
        }
      }

      let specified = (this.fid.value && this.fid.value.length > 0) || (this.tid.value && this.tid.value.length > 0);

      let match = false;
      let matchBy = '';
      if (!(specified)) {
        let pref = dPrefs.find(cur => cur.lid === r.fid.value || cur.lid === r.tid.value);
        match = pref ? true : false;
        matchBy = 'By Prefs';
        if (!(match)) {
          let lineHistory = dHistory.find(cur => cur.fid === r.fid.value && cur.tid === r.tid.value);
          match = lineHistory ? true : false;
          matchBy = 'By Line History';
          if (!(match)) {
            let areaFHistory = dHistory.find(cur => this.getLocArea(r.fid.value).includes(cur.fid));// && cur.tid === rr.tid.value);
            match = areaFHistory ? true : false;
            matchBy = 'By Area(f) History';
            if (!(match)) {
              let areaTHistory = dHistory.find(cur => this.getLocArea(r.tid.value).includes(cur.tid));// && cur.fid === rr.fid.value);
              match = areaTHistory ? true : false;
              matchBy = 'By Area(t) History';
            }
          }
        }
      }

      if (specified || match) {
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
          dRemark: r.dRemark.value,
          reason: matchBy,
          pickupTime: r.pickupTime.value,
          visitTime: r.visitTime.value,
          whenPickup: this.setWhenPickupRide(r),
          immediate: r.immediate.value
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

      if (!(this.fh.isEmpty && this.th.isEmpty())) {
        if (this.fh.value > this.th.value) {
          this.th.value = this.fh.value;
        }
        if (!rr.pickupTime.isEmpty()) {
          if (!(this.fh.value <= rr.pickupTime.value && rr.pickupTime.value <= this.th.value)) {
            continue;
          }
        }
      }

      let specified = (this.fid.value && this.fid.value.length > 0) || (this.tid.value && this.tid.value.length > 0);

      let match = false;
      let matchBy = '';
      if (!(specified)) {
        let pref = dPrefs.find(cur => cur.lid === rr.fid.value || cur.lid === rr.tid.value);
        match = pref ? true : false;
        matchBy = 'By Prefs';
        if (!(match)) {
          let lineHistory = dHistory.find(cur => cur.fid === rr.fid.value && cur.tid === rr.tid.value);
          match = lineHistory ? true : false;
          matchBy = 'By Line History';
          if (!(match)) {
            let areaFHistory = dHistory.find(cur => this.getLocArea(rr.fid.value).includes(cur.fid));// && cur.tid === rr.tid.value);
            match = areaFHistory ? true : false;
            matchBy = 'By Area(f) History';
            if (!(match)) {
              let areaTHistory = dHistory.find(cur => this.getLocArea(rr.tid.value).includes(cur.tid));// && cur.fid === rr.fid.value);
              match = areaTHistory ? true : false;
              matchBy = 'By Area(t) History';
            }
          }
        }
      }


      let isBorder = this.locAreas.find(cur => cur.id === rr.fid.value).isBorder;
      let immediate = isBorder && rr.visitTime.isEmpty() || !isBorder && rr.pickupTime.isEmpty();

      if (specified || match) {

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
          dRemark: rr.remark.value,
          reason: matchBy,
          pickupTime: rr.pickupTime.value,
          visitTime: rr.visitTime.value,
          whenPickup: this.setWhenPickupRegisterRide(rr),
          immediate: immediate
        };
        result.newregistered.push(row);
      }
    }

    result.registered.sort((r1, r2) =>
      r1.pickupTime.localeCompare(r2.pickupTime) == 0
        ? r1.from.localeCompare(r2.from)
        : r1.pickupTime.localeCompare(r2.pickupTime));

    result.newregistered.sort((r1, r2) =>
      r1.pickupTime.localeCompare(r2.pickupTime) == 0
        ? r1.from.localeCompare(r2.from)
        : r1.pickupTime.localeCompare(r2.pickupTime));


    // result.newregistered.sort((r1, r2) =>
    //   r1.immediate && r2.immediate
    //     ? r1.pickupTime.localeCompare(r2.pickupTime) == 0
    //       ? r1.from.localeCompare(r2.from)
    //       : r1.pickupTime.localeCompare(r2.pickupTime)
    //     : r1.immediate ? 1 : r2.immediate ? -1 : 0);

    return result;
  }

  setWhenPickupRegisterRide(rr: RegisterRide) {



    //  isBorder | visitTime | pickupTime
    //  ---------------------------------
    //  immediate = isborder && visitTime.empty || !isborder && pickupTime.empty
    //  isBorder &  immediate  ==> pickupTime: asap (MinPickupBorder - MaxPickupBorder)
    //  isBorder & !immediate  ==> max-pickup-time: vt-2
    // !isBorder &  immediate  ==> pickupTime: asap - (now - MaxPickupHospital)
    // !isBorder & !immediate  ==> max-pickup-time: vt




    let when = '';
    let isBorder = this.locAreas.find(cur => cur.id === rr.fid.value).isBorder;
    let immediate = isBorder && rr.visitTime.isEmpty() || !isBorder && rr.pickupTime.isEmpty();
    if (isBorder && immediate) {//border
      when = `Pickup: A.S.A.P`;
    }
    else if (isBorder && !immediate) {//border
      when = `Max Pickup: ` + addHours(PickupTimePrevHours, rr.visitTime.value);
    }
    else if (!isBorder && immediate) {//hospital
      when = `Pickup: A.S.A.P (max ${MaxPickupHospital})`;
    }
    else if (!isBorder && !immediate) {//hospital
      when = `Pickup About: ${rr.pickupTime.value} (max ${MaxPickupHospital})`;
    }
    return when;
  }

  setWhenPickupRide(r: Ride) {

    let when = '';
    let isBorder = this.locAreas.find(cur => cur.id === r.fid.value).isBorder;
    let immediate = isBorder && r.visitTime.isEmpty() || !isBorder && r.pickupTime.isEmpty();
    if (isBorder && immediate) {//border
      when = `Pickup: A.S.A.P`;
    }
    else if (isBorder && !immediate) {//border
      when = `Max Pickup: ` + addHours(PickupTimePrevHours, r.visitTime.value);
    }
    else if (!isBorder && immediate) {//hospital
      when = `Pickup: A.S.A.P (max ${MaxPickupHospital})`;
    }
    else if (!isBorder && !immediate) {//hospital
      when = `Pickup About: ${r.pickupTime.value} (max ${MaxPickupHospital})`;
    }
    return when;
  }

  getLocsArea(lids: string[]): string[] {
    let result: string[] = [];
    for (const l of lids) {
      result.push(...this.getLocArea(l));
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

  getIsBorder(lid: string): boolean {
    let f = this.locAreas.find(cur => cur.id === lid);
    if (f) {
      return f.isBorder;
    }
    return false;
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
      dRemark: ride.dRemark.value,
      pickupTime: ride.pickupTime.value,
      visitTime: ride.visitTime.value,
      immediate: ride.immediate.value,
      whenPickup: this.setWhenPickupRide(ride)
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
  todayMidnigth: Date;

  ridesToRegister: ride4DriverRideRegister[];
  rides: ride4DriverRideRegister[];

  clientLastRefreshDate: Date = addDays(TODAY, undefined, false);

  constructor(private context: Context, private dialog: DialogService) { }

  async prevDay() {
    this.params.date.value = addDays(-1, this.params.date.value);
  }

  async nextDay() {
    this.params.date.value = addDays(+1, this.params.date.value);
  }

  async ngOnInit() {
    this.driver = await this.context.for(Driver).findFirst({
      where: d => d.uid.isEqualTo(this.context.user.id),
    });
    if (!(this.driver)) {
      throw 'Error - You are not register to use app';
    }
    this.todayMidnigth = addDays(0);

    this.params.fid.value = this.driver.defaultFromLocation && this.driver.defaultFromLocation.value && this.driver.defaultFromLocation.value.length > 0 ? this.driver.defaultFromLocation.value : null;
    this.params.tid.value = this.driver.defaultToLocation && this.driver.defaultToLocation.value && this.driver.defaultToLocation.value.length > 0 ? this.driver.defaultToLocation.value : null;
    this.params.fh.value = this.driver.defaultFromTime ? this.driver.defaultFromTime.value : null;
    this.params.th.value = this.driver.defaultToTime ? this.driver.defaultToTime.value : null;
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
        if (this.driver.defaultFromTime.value != this.params.fh.value) {
          this.driver.defaultFromTime.value = this.params.fh.value;
          changed = true;
        }
        if (this.driver.defaultToTime.value != this.params.th.value) {
          this.driver.defaultToTime.value = this.params.th.value;
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

        this.clientLastRefreshDate = addDays(TODAY, undefined, false);
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
    if (this.params.fh.isEmpty() || this.params.th.isEmpty()) {
      await this.dialog.error('Please enter the hours you can pickup, TX!');
      this.params.fh.validationError = ' ';
      return;
    }
    else if (this.params.fh.value > this.params.th.value) {
      await this.dialog.error(`'From' can not be more then 'To', TX!`);
      this.params.fh.validationError = ' ';
      return;
    }
    let reg = this.context.for(RegisterDriver).create();
    reg.date.value = this.params.date.value;
    reg.fh.value = this.params.fh.value;
    reg.th.value = this.params.th.value;
    reg.did.value = this.driver.id.value;
    reg.seats.value = this.params.seats.value;
    reg.rrid.value = r.rrid;
    reg.rid.value = r.rid;
    await reg.save();
    await this.updateRegisterRides(reg.rrid.value, 1);
    await this.refresh();
    await this.dialog.error('Thank You! We contact you ASAP to attach you to ride')
  }

  async updateRegisterRides(rrid: string, add: number) {
    let rr = await this.context.for(RegisterRide).findId(rrid);
    if (rr) {
      rr.dCount.value = rr.dCount.value + add;
      await rr.save();
    }
  }

}
