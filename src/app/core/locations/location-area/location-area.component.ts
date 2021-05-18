import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DataAreaSettings, Filter } from '@remult/core';
import { DriverPrefs } from '../../drivers/driverPrefs';
import { Location, LocationArea, LocationAreaColumn, LocationType } from '../location';

@Component({
  selector: 'app-location-area',
  templateUrl: './location-area.component.html',
  styleUrls: ['./location-area.component.scss']
})
export class LocationAreaComponent implements OnInit {

  args: { dId: string };
  okPressed = false;
  borders: { id: string, selected: boolean, name: string, area?: LocationArea, visible?:boolean }[] = [];
  existsBordersIds: string[] = [];


  selectedCount = 0;

  selected = new LocationAreaColumn({
    defaultValue: LocationArea.all,
    caption: 'Filter By Area',
    valueChange: async () => { this.filter(); },
  });
  areaSettings = new DataAreaSettings({
    columnSettings: () => [{ column: this.selected, }],
  });
  // gridSettings = this.context.for(Location).gridSettings({
  //   where: l => l.type.isEqualTo(LocationType.border)
  //     .and(this.selected.value && this.selected.value.id.length > 0 && this.selected.value != LocationArea.all
  //       ? l.area.isEqualTo(this.selected)
  //       : new Filter((l) => { /*no-filter*/ })),
  //   orderBy: l => l.name,
  //   allowSelection: true,
  //   showPagination: false,
  //   columnSettings: l => [l.name],
  // });

  constructor(private context: Context, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    await this.refresh();
  }

  onSelection() {
    this.selectedCount = 0;
    for (const b of this.borders) {
      if (b.selected) {
        ++this.selectedCount;
      }
    }
    console.log("sc: " + this.selectedCount);
  }

  async refresh() {
    await this.retrieve();
    this.filter();
    this.selectedCount = this.existsBordersIds.length;
  }

  async retrieve() {

    this.existsBordersIds = [];
    // console.log(this.args.dId);
    for await (const pref of this.context.for(DriverPrefs).iterate({
      where: prf => prf.driverId.isEqualTo(this.args.dId),
    })) {
      this.existsBordersIds.push(pref.locationId.value);
    }

    this.borders = [];
    for await (const loc of this.context.for(Location).iterate({
      where: l => l.type.isEqualTo(LocationType.border),
    })) {
      this.borders.push({
        id: loc.id.value,
        selected: this.existsBordersIds.includes(loc.id.value),
        name: loc.name.value,
        area: loc.area.value,
        visible: true,
      });
    }
    this.borders.sort((b1, b2) => b1.name.localeCompare(b2.name));
    // this.gridSettings.reloadData();
  }

  filter() {
    for (const loc of this.borders) {
      if (this.selected.value && this.selected.value.id.length > 0 && (!(this.selected.value == LocationArea.all))){
        loc.visible = (loc.area == this.selected.value);
      }
      else{
        loc.visible = true;
      }
    }
  }

  async saveSelected() {

    // console.log(this.borders);
    if (this.borders.length > 0) {
      for (const loc of this.borders) {
        if (this.existsBordersIds.includes(loc.id)) {
          if (loc.selected) {
            // was selected & stay selected
          }
          else {
            let prefRecord = await this.context.for(DriverPrefs).findFirst({
              where: prf => prf.driverId.isEqualTo(this.args.dId)
                .and(prf.locationId.isEqualTo(loc.id))
            });
            if (prefRecord) {
              await prefRecord.delete();
            }
          }
        }
        else if (loc.selected) {// was not exists now is selected create it.
          let pref = await this.context.for(DriverPrefs).create();
          pref.locationId.value = loc.id;
          pref.driverId.value = this.args.dId;
          await pref.save();
        }
      }
      this.select();
    }
    else {
      console.log("No selected locations");
    }
  }

  close() {
    this.dialogRef.close();
  }
  select() {
    this.dialogRef.close();
    this.okPressed = true;
  }

}
