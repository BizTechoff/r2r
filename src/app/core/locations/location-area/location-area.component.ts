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
  borders: { id: string, selected: boolean, name: string, fBorder: boolean, tBorder: boolean, area?: LocationArea, ivisible?: boolean }[] = [];
  existsBordersIds: { lid: string, fb: boolean, tb: boolean }[] = [];


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

  onSelection(lid: string, fb: boolean = false) {
    this.selectedCount = 0;
    for (const b of this.borders) {
      if (b.selected) {
        ++this.selectedCount;
        b.fBorder = true;

        if (!(fb)) {
          if (b.id === lid) {
            b.tBorder = true;
            // if (!(b.tBorder)) {
            //   let f = this.existsBordersIds.find(cur => cur.lid === lid);
            //   if (f) {
            //     b.fBorder = f.fb;
            //   }
            //   else {
            //     b.fBorder = true;
            //   }
            // }
          }
        }
      }
      else {
        b.fBorder = false;
        b.tBorder = false;
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
      where: prf => prf.driverId.isEqualTo(this.args.dId)
        .and(prf.active.isEqualTo(true)),
    })) {
      this.existsBordersIds.push({ lid: pref.locationId.value, fb: pref.fBorder.value, tb: pref.tBorder.value });
    }

    this.borders = [];
    for await (const loc of this.context.for(Location).iterate({
      where: l => l.type.isEqualTo(LocationType.border),
    })) {
      let f = this.existsBordersIds.find(cur => cur.lid === loc.id.value);
      this.borders.push({
        id: loc.id.value,
        selected: f ? true : false,
        name: loc.name.value,
        fBorder: f ? true : false,
        tBorder: f ? f.tb : false,
        area: loc.area.value,
        ivisible: true,
      });
    }
    this.borders.sort((b1, b2) => b1.name.localeCompare(b2.name));
    // this.gridSettings.reloadData();
  }

  filter() {
    for (const loc of this.borders) {
      console.log('filterfilterfilter');
      if (this.selected.value == LocationArea.all) {
        loc.ivisible = true;
      }
      else {
        loc.ivisible = (loc.area == this.selected.value);
      }
    }
  }

  async saveSelected() {

    // console.log(this.borders);
    if (this.borders.length > 0) {
      for (const loc of this.borders) {
        let f = this.existsBordersIds.find(cur => cur.lid === loc.id);
        if (f) {
          let pref = await this.context.for(DriverPrefs).findFirst({
            where: cur => cur.locationId.isEqualTo(loc.id)
              .and(cur.driverId.isEqualTo(this.args.dId)),
          });
          if (loc.selected) {
            pref.fBorder.value = loc.selected;
            pref.tBorder.value = loc.tBorder;
            pref.active.value = true;
            await pref.save();
          }
          else {
            pref.fBorder.value = false;
            pref.tBorder.value = false;
            pref.active.value = false;
            await pref.save();
          }
        }
        else {
          if (loc.selected) {
            let pref = await this.context.for(DriverPrefs).findOrCreate({
              where: cur => cur.locationId.isEqualTo(loc.id)
                .and(cur.driverId.isEqualTo(this.args.dId))
            });

            pref.fBorder.value = loc.selected;
            pref.tBorder.value = loc.tBorder;
            pref.active.value = true;
            await pref.save();
          }
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
