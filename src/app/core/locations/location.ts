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

  constructor(private context: Context, caption: string, dbName: string) {
    super({
      caption: caption,
      dbName: dbName,
      dataControlSettings: () => ({
        getValue: () => this.context.for(Location).lookup(this).name.value,
        hideDataOnInput: true,
        clickIcon: 'search',
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
