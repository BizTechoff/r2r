import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { ApplicationSettings } from './applicationSettings';

@Component({
  selector: 'app-application-settings',
  templateUrl: './application-settings.component.html',
  styleUrls: ['./application-settings.component.scss']
})
export class ApplicationSettingsComponent implements OnInit {

  constructor(private context: Context) { }

  async ngOnInit() {
    if((await this.context.for(ApplicationSettings).count()) == 0){
      let defs = this.context.for(ApplicationSettings).create();
      await defs.save();
    }
  }

  appSettings = this.context.for(ApplicationSettings).gridSettings({
    allowCRUD: true,
    numOfColumnsInGrid: 10,
    columnSettings: (a) => [
      a.matchingDiffMinutes,
      a.numOfDaysToRetrieveDriverRides,
      a.numOfDaysToShowOnRides,
      a.delimiterAfternoonHour,
    ],
  });

}
