import { Component, OnInit } from '@angular/core';
import { BoolColumn, Context, DateColumn, Filter, ServerController, ServerMethod } from '@remult/core';
import { FILTER_IGNORE, ride4Usher, TODAY } from '../../shared/types';
import { addDays } from '../../shared/utils';
import { Users } from '../../users/users';
import { RegisterDriver } from '../drivers/registerDriver';
import { Location, LocationArea, LocationAreaColumn, LocationIdColumn, LocationType } from '../locations/location';
import { Ride, RideStatus } from '../rides/ride';
import { RideActivity } from '../rides/rideActivity';
import { SetDriverComponent } from './set-driver/set-driver.component';

@ServerController({ key: 'u/rides', allowed: true })
class usherParams {
  date = new DateColumn({ defaultValue: addDays(TODAY), valueChange: async () => { await this.onChanged(); } });
  fid = new LocationIdColumn(this.context,{ caption: 'From Location', valueChange: async () => { await this.onChanged(); } });
  tid = new LocationIdColumn(this.context,{ caption: 'To Location', valueChange: async () => { await this.onChanged(); } });
  area = new LocationAreaColumn({ caption: 'Area', valueChange: async () => { await this.onChanged(); } });
  historyChanged = new BoolColumn({ defaultValue: true });
  constructor(private context: Context) { }
  ready = false;
  onChanged = async () => { };

  hasFid() {
    return this.fid.value && this.fid.value.length > 0;
  }
  hasTid() {
    return this.tid.value && this.tid.value.length > 0;
  }
  hasDate() {
    return this.date.value && this.date.value.getFullYear() > 1900;
  }
  hasArea() {
    return this.area.value && this.area.value !== LocationArea.all;
  }

  @ServerMethod()
  async retrieve(): Promise<ride4Usher[]> {
    var result: ride4Usher[] = [];

    var areaIds: { area: LocationArea, areaIds: string[] }[] = [];
    for await (const loc of this.context.for(Location).iterate()) {
      let f = areaIds.find(cur => cur.area === loc.area.value);
      if (!(f)) {
        f = { area: loc.area.value, areaIds: [] };
        areaIds.push(f);
      }
      f.areaIds.push(loc.id.value);
    }

    // var fidAreaIds: { fid: string, areaIds: string[] }[] = [];
    // for await (const loc of this.context.for(Location).iterate()) {
    //   fidAreaIds.push({
    //     fid: loc.id.value,
    //     areaIds: areaIds.find(cur => cur.area === loc.area.value).areaIds
    //   });
    // }

    // let rideMaxChanged = new Date(2000, 1, 1);
    // console.log(id);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.status.isNotIn(...RideStatus.isNoUsherActionNeeded)
        .and(this.hasTid() ? cur.tid.isEqualTo(this.tid) : FILTER_IGNORE)
        .and(cur.date.isEqualTo(this.date))
        .and(this.hasArea() ? cur.fid.isIn(...areaIds.find(a => a.area === this.area.value).areaIds)
          .or(cur.tid.isIn(...areaIds.find(a => a.area === this.area.value).areaIds)) : FILTER_IGNORE)
        .and(this.hasFid() ? cur.fid.isEqualTo(this.fid) : FILTER_IGNORE)
        .and(this.hasTid() ? cur.tid.isEqualTo(this.tid) : FILTER_IGNORE),
        orderBy: cur => [{column: cur.created, descending: false},{column: cur.fid, descending: false}]
    })) {
 
      // if (rideMaxChanged < r.changed.value) {
      //   rideMaxChanged = r.changed.value;
      // }

      let from = (await this.context.for(Location).findId(r.fid.value));
      let fromName = from.name.value;
      let fromIsBorder = from.type.value == LocationType.border;
      let to = (await this.context.for(Location).findId(r.tid.value));
      let toName = to.name.value;
      let toIsBorder = to.type.value == LocationType.border;
      let key = `${fromName}-${toName}`;

      let row = result.find(r => r.key === key);
      if (!(row)) {
        row = {
          key: key,
          fromIsBorder: fromIsBorder,
          toIsBorder: toIsBorder,
          fromId: from.id.value,
          toId: to.id.value,
          from: fromName,
          to: toName,
          inProgress: 0,
          registers: 0,
          problem: 0,
          w4Accept: 0,
          w4Driver: 0,
          inHospital: 0,
          passengers: 0,
          ridesCount: 0,
          ids: [],
        };
        result.push(row);
      }

      row.inProgress += ([RideStatus.w4_Pickup, RideStatus.w4_Arrived].includes(r.status.value) ? 1 : 0);
      row.w4Accept += (r.status.value == RideStatus.w4_Accept ? 1 : 0);
      row.w4Driver += (r.isHasDriver() ? 0 : 1);
      row.passengers += r.passengers();//registerride.validline(fd-td,fid-tid,days[,v.t])
      row.registers += await this.context.for(RegisterDriver).count(cur => cur.rid.isEqualTo(r.id));
      row.problem += ([RideStatus.PatientNotFound, RideStatus.WrongAddress].includes(r.status.value) ? 1 : 0);
      row.inHospital += ([RideStatus.InHospital].includes(r.status.value) ? 1 : 0);
      row.ridesCount += 1;
    }

    // let h = await this.context.for(RideActivity).findFirst({//max(changed)
    //   orderBy: cur => [{ column: cur.changed, descending: true }]
    // });

    // this.historyChanged.value = rideMaxChanged > h.changed.value;

    result.sort((r1, r2) => (r1.from + '-' + r1.to).localeCompare(r2.from + '-' + r2.to));

    return result;
  }
}

@Component({
  selector: 'app-usher',
  templateUrl: './usher.component.html',
  styleUrls: ['./usher.component.scss']
})
export class UsherComponent implements OnInit {

  params = new usherParams(this.context);

  rides: ride4Usher[];
  clientLastRefreshDate: Date = addDays(TODAY, undefined, false);

  constructor(public context: Context) {
  }

  async ngOnInit() {
    await this.loadUserDefaults();

    await this.refresh();
    this.params.ready = true;
    this.params.onChanged = async () => { await this.refresh(); };
  }

  async refresh() {
    await this.saveUserDefaults();
    this.clientLastRefreshDate = addDays(TODAY, undefined, false);
    this.params.onChanged = async () => { };
    this.rides = await this.params.retrieve();
    this.params.onChanged = async () => { await this.refresh(); };
  }

  async clearFilters() {
    this.params.date.value = addDays(TODAY);
    this.params.fid.value = '';
    this.params.tid.value = '';
    this.params.area.value = LocationArea.all;
    await this.refresh();
  }

  async loadUserDefaults() {
    let u = await this.context.for(Users).findId(this.context.user.id);
    if (u) {
      if (u.hasLastDate()) {
        this.params.date.value = u.lastDate.value;
      }
      if (u.hasLastFid()) {
        this.params.fid.value = u.lastFid.value;
      }
      if (u.hasLastTid()) {
        this.params.tid.value = u.lastTid.value;
      }
      if (u.hasLastArea()) {
        this.params.area.value = u.lastArea.value;
      }
    }
  }

  async saveUserDefaults() {
    if (this.params.date.wasChanged() || this.params.fid.wasChanged() || this.params.tid.wasChanged() || this.params.area.wasChanged()) {
      let u = await this.context.for(Users).findId(this.context.user.id);
      if (u) {
        u.lastDate.value = this.params.date.value;
        u.lastFid.value = this.params.fid.value;
        u.lastTid.value = this.params.tid.value;
        u.lastArea.value = this.params.area.value;
        await u.save();
      }
    }
  }

  async prevDay() {
    this.params.date.value = addDays(-1, this.params.date.value);
    console.log(this.params.date.value);
  }

  async nextDay() {
    this.params.date.value = addDays(+1, this.params.date.value);
    console.log(this.params.date.value);
  }

  async openBackRide(r: Ride): Promise<void> {
  }

  async openApproveDriver(r: ride4Usher) {
  }

  async openShowRides(r: ride4Usher) {
  }

  async openSetDriver(r: ride4Usher) {
    this.context.openDialog(SetDriverComponent, sr => sr.args = {
      date: this.params.date.value,
      from: r.fromId,
      to: r.toId,
    });
  }

  async history() {
    await RideActivity.openRideActivityDialog(this.context, this.params.date.value);
  }

}
