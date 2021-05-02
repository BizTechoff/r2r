import { Context, DateColumn, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { LocationIdColumn } from "../locations/location";


@EntityClass
export class Patient extends IdEntity {

  name = new StringColumn({});
  hebName = new StringColumn({});
  mobile = new StringColumn({});
  idNumber = new StringColumn({});
  birthDate = new DateColumn({});

  defaultBorder?= new LocationIdColumn(this.context, "Default Border", "defaultBorder", true);
  defaultHospital?= new LocationIdColumn(this.context, "Default Hospital", "defaultHospital", true);

  constructor(private context: Context) {
    super({
      name: "patients",
      allowApiCRUD: c => c.isSignedIn(), //[Roles.matcher],
      allowApiRead: c => c.isSignedIn(),
      defaultOrderBy: () => this.name
    });
  }

  hasBirthDate() {
      return this.birthDate && this.birthDate.value && this.birthDate.value.getFullYear() > 2000;
  }
}

export class PatientIdColumn extends StringColumn {

  constructor(private context: Context, caption: string, dbName: string) {
    super({
      caption: caption,
      dbName: dbName,
      dataControlSettings: () => ({
        getValue: () => this.context.for(Patient).lookup(this).name.value,
        hideDataOnInput: true,
        clickIcon: 'search',
        click: (p) => {
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Patient, {
              onSelect: l => this.value = l.id.value,
              searchColumn: l => l.name
            }));
        }
      })
    });
  }
}
