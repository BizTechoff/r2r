import { Component, OnInit } from '@angular/core';
import { BusyService } from '@remult/angular';
import { Context, StringColumn } from '@remult/core';
import { Roles } from '../../users/roles';
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
    allowCRUD: this.context.isAllowed(Roles.admin),
    allowDelete: false,
    numOfColumnsInGrid: 10,
    columnSettings: (d) => [
      d.name,
      d.type,
      d.area,
    ],
    where: l => this.search.value ? l.name.isContains(this.search) : undefined,
    orderBy: l => [{ column: l.type, descending: false }, { column: l.name, descending: false }],
    // rowButtons: [
    //   {
    //     textInMenu: "Delete Location",
    //     // click: async (p) => await this.openRideDialog(p),
    //     icon: "delete",
    //     visible: (d) => !d.isNew(),
    //     // showInLine: true,
  
    //     click: async (r) => {
    //       let name = (await this.context.for(Patient).findId(r.patientId.value)).name.value;
    //       if (await this.snakebar.confirmDelete(name)) {
    //         await r.delete();
    //       }
    //     },
    //   },
    // ],
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
  async addLocation() { }


}
