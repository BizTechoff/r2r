import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, Filter, GridSettings, NumberColumn, ServerController, StringColumn } from '@remult/core';
import { DriverIdColumn } from '../../core/drivers/driver';
import { LocationIdColumn } from '../../core/locations/location';
import { PatientIdColumn } from '../../core/patients/patient';
import { Ride, RideStatus, RideStatusColumn } from '../../core/rides/ride';
import { FILTER_IGNORE, TODAY } from '../../shared/types';
import { addDays } from '../../shared/utils';
import { Roles } from '../../users/roles';

export class driverRidesCountRow {
  dName = new StringColumn({ caption: 'Driver' });
  rCount = new NumberColumn({ caption: 'Rides Count' });
}

@ServerController({ key: 'a/rep', allowed: Roles.admin })
class reportParams {
  fdate = new DateColumn({
    caption: 'From Date', defaultValue: addDays(TODAY),
    valueChange: () => {
      if (this.fdate.value > this.tdate.value) {
        this.tdate.value = this.fdate.value;
      }
    }
  });
  tdate = new DateColumn({ caption: 'To Date', defaultValue: addDays(TODAY) });
  fid = new LocationIdColumn(this.context, { caption: 'From Location', dataControlSettings: () => ({ width: '300' }) });
  tid = new LocationIdColumn(this.context, { caption: 'To Location' });
  did = new DriverIdColumn({ caption: 'Driver' }, this.context);
  pid = new PatientIdColumn(this.context, { caption: 'Patient' });
  status = new RideStatusColumn({ caption: 'Status' }, true);
  constructor(private context: Context) { }
}

@Component({
  selector: 'app-general-report',
  templateUrl: './general-report.component.html',
  styleUrls: ['./general-report.component.scss']
})
export class GeneralReportComponent implements OnInit {

  params = new reportParams(this.context);
  settings: GridSettings = this.context.for(Ride).gridSettings({
    where: cur => cur.date.isGreaterOrEqualTo(this.params.fdate)
      .and(cur.date.isLessOrEqualTo(this.params.tdate))
      .and(this.params.fid.value ? cur.fid.isEqualTo(this.params.fid) : FILTER_IGNORE)
      .and(this.params.tid.value ? cur.tid.isEqualTo(this.params.tid) : FILTER_IGNORE)
      .and(!this.params.status.value || this.params.status.value.id === 'all' ? FILTER_IGNORE : cur.status.isIn(...[this.params.status])),
    get: { limit: 25 },
    orderBy: (cur) => [{ column: cur.date, descending: true }, { column: cur.visitTime, descending: true }],
    allowCRUD: false,
    allowInsert: false,
    allowUpdate: false,
    allowDelete: false,
    numOfColumnsInGrid: 30
  });

  constructor(private context: Context) { }

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    await this.settings.reloadData();
  }

}
