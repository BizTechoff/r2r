import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DateColumn, ServerFunction } from '@remult/core';
import { DynamicServerSideSearchDialogComponent } from '../../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component';
import { ride4Driver } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Location, LocationIdColumn } from '../../locations/location';
import { RegisterDriver } from './registerDriver';

@Component({
  selector: 'app-driver-register',
  templateUrl: './driver-register.component.html',
  styleUrls: ['./driver-register.component.scss']
})
export class DriverRegisterComponent implements OnInit {

  selectedDate: DateColumn;
  selectedFrom: LocationIdColumn;
  selectedTo: LocationIdColumn;
  toolbar: DataAreaSettings;

  rides: ride4Driver[];
  clientLastRefreshDate: Date = new Date();
  demoDates: string;
  static lastRefreshDate: Date = new Date();//client time

  constructor(public context: Context) { }

  async ngOnInit() {

    let date = new Date(2021, 2, 3);
    this.selectedFrom = new LocationIdColumn({
      dataControlSettings: () => ({
        getValue: () => this.context.for(Location).lookup(this.selectedFrom).name.value,
        hideDataOnInput: true,
        clickIcon: 'search',
        width: "150px",
        click: () => {
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Location, {
              onSelect: l => this.selectedFrom.value = l.id.value,
              searchColumn: l => l.name,
              where: l => [l.id.isIn(...this.rides.map(r => r.fId))],
            }));
        }
      }),
      caption: "From"
    }, this.context);
    this.selectedTo = new LocationIdColumn({ caption: "To" }, this.context);
    this.selectedDate = new DateColumn({ caption: "Date", defaultValue: new Date(date.getFullYear(), date.getMonth(), date.getDate()) });
    this.toolbar = new DataAreaSettings({
      columnSettings: () => [
        [this.selectedDate, this.selectedFrom, this.selectedTo]
      ],
    });

    this.rides = await DriverRegisterComponent.retrieve(
      this.selectedDate.value,
      this.selectedFrom.value,
      this.selectedTo.value,
      this.context);
  }

  @ServerFunction({allowed: Roles.driver})
  static async retrieve(date:Date, fid:string, tid:string, context?:Context) {
    var result:ride4Driver[] = [];

    for await (const reg of context.for(RegisterDriver).iterate({
      
    })) {
      
    }

    return result;
  }

}
