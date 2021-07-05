import { ColumnOptions, ColumnSettings, Context, EntityClass, IdEntity, StringColumn, ValueListColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { Roles } from "../../users/roles";

@EntityClass
export class Location extends IdEntity {

  name = new StringColumn({});
  type = new LocationTypeColumn({
    valueChange: () => {
      if (this.type.value === LocationType.hospital) {
        this.area.value = LocationArea.all;
      }
    }
  });
  area = new LocationAreaColumn({});

  constructor(private context: Context) {
    super({
      name: "locations",
      allowApiInsert: [Roles.admin, Roles.usher, Roles.matcher],
      allowApiUpdate: [Roles.admin],
      allowApiDelete: false,
      defaultOrderBy: () => [this.type, this.name],
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
  id: string;
}
export class LocationAreaColumn extends ValueListColumn<LocationArea>{
  constructor(options?: ColumnSettings<LocationArea>) {
    super(LocationArea, {
      caption: 'Select Area',
      defaultValue: LocationArea.all,
      ...options
    });
  }
}
export class LocationType {
  static hospital = new LocationType();
  static border = new LocationType();
  constructor() { }
  id: string;
}
export class LocationTypeColumn extends ValueListColumn<LocationType>{
  constructor(options: ColumnOptions) {
    super(LocationType, options);
  }
  isBorder() {
    return this.value === LocationType.border;
  }
}

export class LocationIdColumn extends StringColumn {
  selected: Location = undefined;
  constructor(private context?: Context, options?: ColumnSettings<string>) {
    super({
      valueChange: async () => {
        this.selected = await context.for(Location).findId(this.value);
      },
      dataControlSettings: () => ({
        getValue: () => {
          this.selected = this.context.for(Location).lookup(this);
          return this.selected.name.value;
        },
        hideDataOnInput: true,
        clickIcon: 'search',
        width: "150px",
        click: async () => {
          await this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Location, {
              onClear: () => { this.value = ''; },
              onSelect: l => { this.value = l.id.value; },
              searchColumn: l => l.name
            }));
        }
      }),
    }, options);
  };
}
