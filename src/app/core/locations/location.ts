import { ColumnOptions, ColumnSettings, Context, EntityClass, IdEntity, StringColumn, ValueListColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";

@EntityClass
export class Location extends IdEntity {

  name = new StringColumn({});
  type = new LocationTypeColumn({});
  area = new LocationAreaColumn({});

  constructor(private context: Context) {
    super({
      name: "locations",
      allowApiCRUD: c => c.isSignedIn(),
      allowApiRead: c => c.isSignedIn(),


      saving: async () => {
        if (context.onServer) {
          if (this.isNew() && this.type.isEqualTo(LocationType.border)) {
            this.area.value = LocationArea.get(this.name.value);
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
  id;
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

  constructor(options?: ColumnSettings<string>, private context?: Context, allowNull = false, onlyBorders = false) {
    super({
      allowNull: allowNull,
      validate: () => {
        // console.log(this.defs.allowNull);
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
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Location, {
              onSelect: l => this.value = l.id.value,
              searchColumn: l => l.name
            }));
        }
      }),//...options
    },
      options);
  }
}
