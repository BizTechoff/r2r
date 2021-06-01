import { ColumnOptions, ColumnSettings, Context, EntityClass, Filter, IdEntity, StringColumn, ValueListColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { Roles } from "../../users/roles";

@EntityClass
export class Location extends IdEntity {

  name = new StringColumn({});
  type = new LocationTypeColumn({});
  area = new LocationAreaColumn({});

  constructor(private context: Context) {
    super({
      name: "locations",
      allowApiInsert: [Roles.matcher, Roles.usher, Roles.admin],
      allowApiUpdate: [Roles.admin],
      allowApiDelete: false,
      allowApiRead: c => c.isSignedIn(),

      saving: async () => {
        if (context.onServer) {
          if (!(this.area.value)) {
            if (this.isNew() && (this.type.value == LocationType.border)) {
              this.area.value = LocationArea.get(this.name.value);
            }
          }
        }
      }
    });
  }

}

export class LocationArea {
  static erez = new LocationArea(n => ["Erez"].includes(n));
  static tarkumia_betlechem = new LocationArea(n => ["Tarkumia", "Bethlehem"].includes(n));
  static reihan_jalame = new LocationArea(n => ["Reihan", "Jalame"].includes(n));
  static center = new LocationArea(n => (!(LocationArea.erez.filter(n) || LocationArea.tarkumia_betlechem.filter(n) || LocationArea.reihan_jalame.filter(n))));
  static all = new LocationArea(n => true);
  constructor(public filter: (name: string) => boolean) { }
  static get(value: string) {
    if (LocationArea.erez.filter(value)) {
      return LocationArea.erez;
    }
    if (LocationArea.tarkumia_betlechem.filter(value)) {
      return LocationArea.tarkumia_betlechem;
    }
    if (LocationArea.reihan_jalame.filter(value)) {
      return LocationArea.reihan_jalame;
    }
    if (LocationArea.center.filter(value)) {
      return LocationArea.center;
    }
  }
  id;//: string;
}
export class LocationAreaColumn extends ValueListColumn<LocationArea>{
  constructor(options: ColumnOptions) {
    super(LocationArea, options);
  }
}
export class LocationType {
  static hospital = new LocationType();
  static border = new LocationType();
  // static driver = new LocationType();
  constructor() { }
}
export class LocationTypeColumn extends ValueListColumn<LocationType>{
  constructor(options: ColumnOptions) {
    super(LocationType, options);
  }
}

export class LocationIdColumn extends StringColumn {
  private types: LocationType[] = [LocationType.border, LocationType.hospital];
  constructor(options?: ColumnSettings<string>, private context?: Context) {
    super({
      validate: () => {
        // console.log(this.defs.allowNull);
        // if (this.defs.allowNull) { }
        // else if (this.value && this.value.length > 0) { }
        // else {
        //   this.validationError = " No Location Seleceted";
        // }
      },
      dataControlSettings: () => ({
        getValue: () => this.context.for(Location).lookup(this).name.value,
        hideDataOnInput: true,
        clickIcon: 'search',
        width: "150px",
        click: () => {
          console.log(this.types);
          let trueFilter = new Filter((f) => { return true; });
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Location, {
              onClear: () => this.value = '',
              onSelect: l => this.value = l.id.value,
              searchColumn: l => l.name,
              // where: l => l.type.isIn(this.types),
            }));
        }
      }),//...options
    },
      options);
  };
  async area(): Promise<string[]> {
    let result: string[] = [];
    let loc = await this.context.for(Location).findId(this.value);
    if (loc.type === LocationType.border) {
      for await (const l of this.context.for(Location).iterate({
        where: cur => cur.area.isEqualTo(loc.area)
      })) {
        result.push(l.id.value);
      }
    }
    return result;
  }
}
export class BorderAreaIdColumn extends StringColumn {

  constructor(options?: ColumnSettings<string>, private context?: Context) {
    super({
      validate: () => {
        if (this.defs.allowNull) { }
        else if (this.value && this.value.length > 0) { }
        else {
          this.validationError = " No Location Seleceted";
        }
      },
      dataControlSettings: () => ({
        getValue: () => this.context.for(Location).lookup(this).name.value,
        hideDataOnInput: true,
        clickIcon: 'search',
        width: "150px",
        click: () => {
          // selected = new BorderAreaList({});
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Location, {
              onSelect: l => this.value = l.id.value,
              searchColumn: l => l.name,
              // where: l => selected?l.area.isEqualTo(selected):new Filter(() => {}),
            }));
        }
      }),//...options
    },
      options);
  }
}
