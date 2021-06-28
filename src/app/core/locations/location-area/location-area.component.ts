import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DataAreaSettings, ServerFunction } from '@remult/core';
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
  borders: { id: string, selected: boolean, name: string, area?: LocationArea, ivisible?: boolean }[] = [];
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

  constructor(private context: Context, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    await this.refresh();
  }

  async refresh() {
    await this.retrieve();
    this.filter();
    this.selectedCount = this.existsBordersIds.length;
  }

  onSelected(){
    let count = 0;
    for (const loc of this.borders) {
      if(loc.selected){
        ++count;
      }
    }
    this.selectedCount = count;
  }

  async retrieve() {

    this.existsBordersIds = [];
    for await (const pref of this.context.for(DriverPrefs).iterate({
      where: prf => prf.did.isEqualTo(this.args.dId)
    })) {
      this.existsBordersIds.push(pref.lid.value);
    }

    this.borders = [];
    for await (const loc of this.context.for(Location).iterate({
      where: l => l.type.isEqualTo(LocationType.border),
    })) {
      let f = this.existsBordersIds.includes(loc.id.value);
      this.borders.push({
        id: loc.id.value,
        selected: f ? true : false,
        name: loc.name.value,
        area: loc.area.value,
        ivisible: true,
      });
    }
    this.borders.sort((b1, b2) => b1.name.localeCompare(b2.name));
  }

  filter() {
    for (const loc of this.borders) {
      // console.log('filterfilterfilter');
      if (this.selected.value == LocationArea.all) {
        loc.ivisible = true;
      }
      else {
        loc.ivisible = (loc.area == this.selected.value);
      }
    }
  }

  @ServerFunction({ allowed: c => c.isSignedIn() })
  static async setDriverPrefs(did: string, removes: string[], adds: string[], context?: Context) {
    for await (const pref of context.for(DriverPrefs).iterate({
      where: cur => cur.did.isEqualTo(did)
    })) {
      await pref.delete();
    }

    for (const lid of adds) {
      let pref = context.for(DriverPrefs).create();
      pref.did.value = did;
      pref.lid.value = lid;
      await pref.save();
    }
  }

  async saveSelected() {
    await LocationAreaComponent.setDriverPrefs(
      this.args.dId,
      this.existsBordersIds,
      this.borders.filter(cur => cur.selected).map(cur => cur.id),
      this.context);
    this.select();
  }

  close() {
    this.dialogRef.close();
  }
  select() {
    this.dialogRef.close();
    this.okPressed = true;
  }

}
