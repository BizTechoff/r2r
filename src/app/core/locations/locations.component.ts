import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, StringColumn } from '@remult/core';
import { Location } from './location';

@Component({
  selector: 'app-locations',
  templateUrl: './locations.component.html',
  styleUrls: ['./locations.component.scss']
})
export class LocationsComponent implements OnInit {

  search = new StringColumn({
    caption: 'search location name',
    valueChange: () => this.busy.donotWait(async () => this.retrieveLocations())

  });
  
  locationsSettings = this.context.for(Location).gridSettings({
    allowCRUD: true,
    where:p=>this.search.value?p.name.isContains(this.search):undefined,
    numOfColumnsInGrid: 10,columnSettings: (d) => [
      // d.name,
      // {
      //   column: this.prefsCount,
      //   // getValue:async() => await this.context.for(DriverPrefs).count(p=>p.driverId.isEqualTo(d.id)),
      // },
      d.name,
      d.type,
      //prefsCount, await this.context.for(DriverPrefs).count(p=>p.driverId.isEqualTo(d.id));
    ], 
  });

  constructor(private context: Context, private busy: BusyService) { }

  ngOnInit() {
    this.retrieveLocations();
  }
  async retrieveLocations() {
    this.locationsSettings.reloadData();
    // this.patients = await this.context.for(Patient).find({
    //   where:p=>this.search.value?p.name.isContains(this.search):undefined
    // });
  }
  async addLocation(){}
  

}
