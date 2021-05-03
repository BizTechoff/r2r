import { ColumnOptions, Context, EntityClass, IdEntity, StringColumn, ValueListColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";

@EntityClass
export class Location extends IdEntity {

  name = new StringColumn({});
  type = new LocationTypeColumn({});

  constructor() {
    super({
      name: "locations",
      allowApiCRUD: c => c.isSignedIn(),
      allowApiRead: c => c.isSignedIn(),
    });
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

  constructor(private context: Context, allowNull = false, onlyBorders = false) {
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
      })
    });
  }
}
