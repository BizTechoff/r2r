import { Component, OnInit } from '@angular/core';
import { Context, StringColumn } from '@remult/core';
import { GridDialogComponent } from '../../common/grid-dialog/grid-dialog.component';
import { Driver } from './driver';
import { DriverPrefs } from './driverPrefs';
import { DriverPrefsSchedule } from './DriverPrefSchedule';
import { Location } from './../locations/location'

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.component.html',
  styleUrls: ['./drivers.component.scss']
})
export class DriversComponent implements OnInit {

  driversSettings = this.context.for(Driver).gridSettings({
    allowCRUD: true,
    rowButtons: [{
      name: "Preferences",
      click: async (d) => await this.openPreferencesDialog(d),
      icon: "settings_suggest",
      visible: (d) => !d.isNew(),
      showInLine: true,
    },],
  });

  constructor(private context: Context) { }

  ngOnInit() {
  }


  async openScheduleDialog(p: Driver) {
  }

  async openSchedulePrefsDialog(prefs: DriverPrefs) {

    this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: "Schedule For " + this.context.for(Location).findId(prefs.locationId.value),
      settings: this.context.for(DriverPrefsSchedule).gridSettings({
        where: s => s.driverPrefsId.isEqualTo(prefs.id),
        newRow: s => s.driverPrefsId.value = prefs.id.value,
        allowCRUD: true,
        columnSettings: s => [
          s.dayOfWeek,
          s.dayPeriod,
        ]
      })
    });
  }

  async openPreferencesDialog(d: Driver) {

    this.context.openDialog(GridDialogComponent, gd => gd.args = {
      title: "Preferenses",
      settings: this.context.for(DriverPrefs).gridSettings({
        where: p => p.driverId.isEqualTo(d.id),
        newRow: p => p.driverId.value = d.id.value,
        allowCRUD: true,
        columnSettings: p => [
          p.locationId
        ],
        rowButtons: [
          {
            name: "Schedules",
            icon: "schedule",
            click: (d) => {
              this.openSchedulePrefsDialog(d)
            },
            showInLine: true,
          },
        ],
      })
    });
  }

}
