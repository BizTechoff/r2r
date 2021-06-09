import { Component, OnInit } from '@angular/core';
import { BoolColumn, Context, DateColumn, Filter, ServerController, ServerMethod } from '@remult/core';
import { ride4Usher, TODAY } from '../../shared/types';
import { addDays } from '../../shared/utils';
import { RegisterDriver } from '../drivers/driver-register/registerDriver';
import { Location, LocationIdColumn, LocationType } from '../locations/location';
import { Ride, RideStatus } from '../rides/ride';
import { RideHistory } from '../rides/rideHistory';
import { SetDriverComponent } from './set-driver/set-driver.component';

@ServerController({ key: 'u/rides', allowed: true })
class usherParams {
  date = new DateColumn({ defaultValue: addDays(TODAY), valueChange: async () => { await this.onChanged(); } });
  fid = new LocationIdColumn({ caption: 'From Location', valueChange: async () => { await this.onChanged(); } }, this.context);
  tid = new LocationIdColumn({ caption: 'To Location', valueChange: async () => { await this.onChanged(); } }, this.context);
  historyChanged = new BoolColumn({ defaultValue: true });
  constructor(private context: Context) { }
  ready = false;
  onChanged = async () => { };

  @ServerMethod()
  async retrieve(): Promise<ride4Usher[]> {
    var result: ride4Usher[] = [];
    // let rideMaxChanged = new Date(2000, 1, 1);
    // console.log(id);
    for await (const r of this.context.for(Ride).iterate({
      where: cur => cur.date.isEqualTo(this.date)
        .and(cur.status.isNotIn(...[RideStatus.succeeded]))
        .and(this.fid.value ? cur.fid.isEqualTo(this.fid) : new Filter(x => { /* true */ }))
        .and(this.tid.value ? cur.tid.isEqualTo(this.tid) : new Filter(x => { /* true */ })),
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
          w4Accept: 0,
          w4Driver: 0,
          passengers: 0,
          ridesCount: 0,
          ids: [],
        };
        result.push(row);
      }

      row.inProgress += ([RideStatus.waitingForPickup, RideStatus.waitingForArrived].includes(r.status.value) ? 1 : 0);
      row.w4Accept += (r.status.value == RideStatus.waitingForAccept ? 1 : 0);
      row.w4Driver += (r.isHasDriver() ? 0 : 1);
      row.passengers += r.passengers();//registerride.validkav(fd-td,fid-tid,days[,v.t])
      row.registers += await this.context.for(RegisterDriver).count(cur => cur.rid.isEqualTo(r.id));
      row.ridesCount += 1;
    }

    // let h = await this.context.for(RideHistory).findFirst({//max(changed)
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
    await this.refresh();
    this.params.ready = true;
    this.params.onChanged = async () => { await this.refresh(); };
  }

  async refresh() {
    this.clientLastRefreshDate = addDays(TODAY,undefined,false);
    this.params.onChanged = async () => { };
    this.rides = await this.params.retrieve();
    this.params.onChanged = async () => { await this.refresh(); };
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
    await RideHistory.openRideHistoryDialog(this.context, this.params.date.value);
  }

}
