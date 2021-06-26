import { Component, OnInit } from '@angular/core';
import { ColumnSettings, Context, DateColumn, Filter, GridSettings, NumberColumn, ServerController, StringColumn, ValueListColumn } from '@remult/core';
import { DriverIdColumn } from '../../core/drivers/driver';
import { LocationIdColumn, LocationType } from '../../core/locations/location';
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
    caption: 'From Date', defaultValue: addDays(-3),
    valueChange: () => {
      if (this.fdate.value > this.tdate.value) {
        this.tdate.value = this.fdate.value;
      }
    }
  });
  tdate = new DateColumn({ caption: 'To Date', defaultValue: addDays(+3) });
  fid = new LocationIdColumn(this.context, { caption: 'From Location', dataControlSettings: () => ({ width: '300' }) });
  tid = new LocationIdColumn(this.context, { caption: 'To Location' });
  did = new DriverIdColumn({ caption: 'Driver' }, this.context);
  pid = new PatientIdColumn(this.context, { caption: 'Patient' });
  status = new RideStatusColumn({ caption: 'Status' }, true);
  type = new RideTypeColumn({ caption: 'Type' }, true);
  constructor(private context: Context) { }
}

@Component({
  selector: 'app-general-report',
  templateUrl: './general-report.component.html',
  styleUrls: ['./general-report.component.scss']
})
export class GeneralReportComponent implements OnInit {

  columnWidth = '140';
  quaterColumnWidth = '100';
  halfColumnWidth = '70';
  params = new reportParams(this.context);
  settings: GridSettings = this.context.for(Ride).gridSettings({
    where: cur => cur.date.isGreaterOrEqualTo(this.params.fdate)
      .and(cur.date.isLessOrEqualTo(this.params.tdate))
      .and(this.params.pid.value ? cur.pid.isEqualTo(this.params.pid) : FILTER_IGNORE)
      .and(this.params.did.value ? cur.did.isEqualTo(this.params.did) : FILTER_IGNORE)
      .and(!this.params.type.value || this.params.type.value.id === 'all' || !cur.fid.selected ? FILTER_IGNORE : this.params.type.value === RideType.b2h ? cur.fid.selected.type.isEqualTo(LocationType.border) : cur.fid.selected.type.isEqualTo(LocationType.hospital))
      .and(this.params.fid.value ? cur.fid.isEqualTo(this.params.fid) : FILTER_IGNORE)
      .and(this.params.tid.value ? cur.tid.isEqualTo(this.params.tid) : FILTER_IGNORE)
      .and(!this.params.status.value || this.params.status.value.id === 'all' ? FILTER_IGNORE : cur.status.isIn(...[this.params.status])),
    get: { limit: 25 },
    orderBy: (cur) => [{ column: cur.date, descending: true }, { column: cur.visitTime, descending: true }],
    allowCRUD: false,
    allowInsert: false,
    allowUpdate: false,
    allowDelete: false,
    numOfColumnsInGrid: 30,
    columnSettings: cur => [
      { column: cur.date, width: this.quaterColumnWidth },
      { column: cur.pid, width: this.columnWidth },
      { column: cur.status, width: this.columnWidth },
      { column: cur.fid, width: this.columnWidth },
      { column: cur.tid, width: this.columnWidth },
      { column: cur.pickupTime, width: this.quaterColumnWidth },
      { column: cur.escortsCount, caption: 'Pass', width: this.halfColumnWidth, getValue: (r) => r.passengers() },
      { column: cur.did, width: this.columnWidth },
      { column: cur.created, width: this.columnWidth },
      { column: cur.createdBy, width: this.columnWidth },
      { column: cur.modifiedBy, width: this.columnWidth },
      { column: cur.modified, width: this.columnWidth }
    ]
  });

  constructor(private context: Context) { }

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    await this.settings.reloadData();
  }

}

export class RideType {
  static b2h = new RideType();
  static h2b = new RideType();
  id: string;
}

//חולה ונהג יכולים להיות ריקים
export class RideTypeColumn extends ValueListColumn<RideType>{
  constructor(options?: ColumnSettings<RideType>, all = false) {
    super(RideType, {
      defaultValue: { id: 'all' },
      dataControlSettings: () => (all
        ? { valueList: [{ caption: 'all', id: 'all' }, ...this.getOptions()] }
        : { valueList: this.getOptions() }),
      ...options
    });
  }
}