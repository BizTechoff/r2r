import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, EntityWhere, Filter, GridSettings, NumberColumn, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { DriverIdColumn } from '../../core/drivers/driver';
import { LocationIdColumn } from '../../core/locations/location';
import { PatientIdColumn } from '../../core/patients/patient';
import { Ride, RideStatus } from '../../core/rides/ride';
import { TODAY } from '../../shared/types';
import { addDays } from '../../shared/utils';
import { Roles } from '../../users/roles';

export class driverRidesCountRow {
  dName = new StringColumn({ caption: 'Driver' });
  rCount = new NumberColumn({ caption: 'Rides Count' });
}

@ServerController({ key: 'a/rep', allowed: Roles.admin })
class reportParams {
  fdate = new DateColumn({ caption: 'From Date', defaultValue: addDays(TODAY) });
  tdate = new DateColumn({ caption: 'To Date', defaultValue: addDays(TODAY) });
  fid = new LocationIdColumn({ caption: 'From Location', dataControlSettings: () => ({ width: '300' }) }, this.context);
  tid = new LocationIdColumn({ caption: 'To Location' }, this.context);
  did = new DriverIdColumn({ caption: 'Driver' }, this.context);
  pid = new PatientIdColumn(this.context, { caption: 'Patient' });

  where: EntityWhere<Ride> = cur => cur.date.isGreaterOrEqualTo(this.fdate)
    .and(cur.date.isLessOrEqualTo(this.tdate))
    .and(this.fid.value ? cur.fid.isEqualTo(this.fid) : new Filter(x => { /* true */ }))
    .and(this.tid.value ? cur.tid.isEqualTo(this.tid) : new Filter(x => { /* true */ }))
    .and(cur.status.isNotIn(...[RideStatus.succeeded]));

  settings: GridSettings = this.context.for(Ride).gridSettings({
    get: { limit: 25 },
    orderBy: (cur) => [{ column: cur.date, descending: true }, { column: cur.visitTime, descending: true }],
    // get:  {where: this.where},
    // where: this.where,
    allowCRUD: false,
    numOfColumnsInGrid: 14,
  });

  constructor(private context: Context) { }

  @ServerMethod()
  async retrieve(): Promise<void> {
    var alwaysTrue = new Filter(x => { /* true */ });

    // this.settings = this.context.for(Ride).gridSettings({
    //   where: cur => cur.date.isGreaterOrEqualTo(this.fdate)
    //     .and(cur.date.isLessOrEqualTo(this.tdate))
    //     .and(this.fid.value ? cur.fid.isEqualTo(this.fid) : alwaysTrue)
    //     .and(this.tid.value ? cur.tid.isEqualTo(this.tid) : alwaysTrue)
    //     .and(cur.status.isNotIn(...[RideStatus.succeeded])),
    //   orderBy: cur => [{ column: cur.visitTime, descending: false }]
    // });
    this.settings.reloadData();
  }

}

@Component({
  selector: 'app-general-report',
  templateUrl: './general-report.component.html',
  styleUrls: ['./general-report.component.scss']
})
export class GeneralReportComponent implements OnInit {

  params = new reportParams(this.context);

  constructor(private context: Context) { }

  async ngOnInit() {
    // await this.refresh();
  }

  async refresh() {
    if (this.params.settings) {
      await this.params.retrieve();
      // await this.params.settings.reloadData();
    }
  }

}
