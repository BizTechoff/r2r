import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, StringColumn } from '@remult/core';
import { Roles } from '../../../users/roles';
import { Location, LocationArea, LocationType } from './../location';

@Component({
  selector: 'app-locations-list',
  templateUrl: './locations-list.component.html',
  styleUrls: ['./locations-list.component.scss']
})
export class LocationsListComponent implements OnInit {

  search = new StringColumn({
    caption: 'search location name',
    valueChange: () => this.busy.donotWait(async () => this.retrieveLocations())

  });

  locationsSettings = this.context.for(Location).gridSettings({
    where: l => this.search.value ? l.name.isContains(this.search) : undefined,
    orderBy: l => [{ column: l.type, descending: false }, { column: l.name, descending: false }],
    //allowCRUD: this.context.isAllowed(Roles.admin),
    allowInsert: true,// this.context.isAllowed([Roles.admin, Roles.usher, Roles.matcher]),
    allowUpdate: this.context.isAllowed([Roles.admin]),
    allowDelete: false,
    numOfColumnsInGrid: 10,
    columnSettings: (d) => [
      d.name,
      d.type,
      { column: d.area, readOnly: (cur) => { return cur.type.value === LocationType.hospital } },
    ],
    validation: (cur) => {
      if (cur.type.value === LocationType.border) {
        if (!(cur.area.value) || cur.area.value === LocationArea.all) {
          cur.area.validationError = "Required";
          throw cur.area.defs.caption + ' ' + cur.area.validationError;
        }
      }
    }
  });

  constructor(private context: Context, private busy: BusyService) { }

  ngOnInit() {
    this.retrieveLocations();
  }
  async retrieveLocations() {
    this.locationsSettings.reloadData();
  }
  async addLocation() { }


}
