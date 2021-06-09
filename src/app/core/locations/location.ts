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
      allowApiInsert: [Roles.admin, Roles.usher, Roles.matcher],
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
  static Erez = new LocationArea(n => ["Erez"].includes(n));
  static Tarkumia_Betlechem = new LocationArea(n => ["Tarkumia", "Bethlehem", "Husan"].includes(n));
  static North = new LocationArea(n => ["Reihan", "Jalame"].includes(n));
  static Center_Mercaz = new LocationArea(n => (!(LocationArea.Erez.filter(n) || LocationArea.Tarkumia_Betlechem.filter(n) || LocationArea.North.filter(n))));
  static all = new LocationArea(n => true);
  constructor(public filter: (name: string) => boolean) { }
  static get(value: string) {
    if (LocationArea.Erez.filter(value)) {
      return LocationArea.Erez;
    }
    if (LocationArea.Tarkumia_Betlechem.filter(value)) {
      return LocationArea.Tarkumia_Betlechem;
    }
    if (LocationArea.North.filter(value)) {
      return LocationArea.North;
    }
    if (LocationArea.Center_Mercaz.filter(value)) {
      return LocationArea.Center_Mercaz;
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
  // id;
}
export class LocationTypeColumn extends ValueListColumn<LocationType>{
  constructor(options: ColumnOptions) {
    super(LocationType, options);
  }
}

export class LocationIdColumn extends StringColumn {
  selected: Location = undefined;
  private types: LocationType[] = [LocationType.border, LocationType.hospital];
  constructor(options?: ColumnSettings<string>, private context?: Context) {
    super({//valueChange
      //caption: this.defs.caption + '',
      dataControlSettings: () => ({
        getValue: () => {
          // console.log('@@@@ LocationIdColumn.getValue called');
          this.selected = this.context.for(Location).lookup(this);
          // console.log('@@@@ LocationIdColumn.getValue called: '  +this.selected.name.value);
          return this.selected.name.value;
        },
        hideDataOnInput: true,
        clickIcon: 'search',
        width: "150px",
        click: () => {
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Location, {
              onClear: () => { this.value = ''; },
              onSelect: l => { this.value = l.id.value; },
              searchColumn: l => l.name
            }));
        }
      }),
    }, options);
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
  hasSelected(){
    return this.selected && this.selected.id && this.selected.id.value && this.selected.id.value.length > 0;
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
