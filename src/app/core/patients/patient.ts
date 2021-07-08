import { BoolColumn, checkForDuplicateValue, ColumnSettings, Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { TODAY } from "../../shared/types";
import { addDays } from "../../shared/utils";
import { LocationIdColumn } from "../locations/location";

@EntityClass
export class Patient extends IdEntity {

  name = new StringColumn({});
  mobile = new StringColumn({});
  idNumber = new StringColumn({});
  birthDate?= new DateColumn({
    allowNull: true,
    valueChange: () => {
      if (this.birthDate.value) {
        let y1 = addDays(TODAY).getFullYear();
        let y2 = this.birthDate.value.getFullYear();
        this.age.value = Math.max(1, y1 - y2);
      }
      else {
        this.age.value = 0;
      }
    },
  });
  remark = new StringColumn({ caption: 'Remark From Patient' });
  age = new NumberColumn({ caption: 'Age' });

  isHasBabyChair = new BoolColumn({ caption: 'Have Babyseat?', defaultValue: false });
  isHasWheelchair = new BoolColumn({ caption: 'Wheelchair?', defaultValue: false });

  defaultBorder?= new LocationIdColumn(this.context,{ allowNull: true });
  defaultHospital?= new LocationIdColumn(this.context,{ allowNull: true });

  constructor(private context: Context) {
    super({
      name: "patients",
      allowApiCRUD: c => c.isSignedIn(), //[Roles.matcher],
      allowApiRead: c => c.isSignedIn(),
      defaultOrderBy: () => this.id,// this.name,
      saving: async () => {
        if (context.onServer) {
          await checkForDuplicateValue(this, this.idNumber, this.context.for(Patient));
        }
      }
    });
  }

  hasBirthDate() {
    return this.birthDate && this.birthDate.value && this.birthDate.value.getFullYear() > 1900;
  }

}
export class PatientIdColumn extends StringColumn {

  constructor(private context?: Context, options?: ColumnSettings<string>) {
    super({
      caption: 'Patient',
      dataControlSettings: () => ({
        getValue: () => this.context.for(Patient).lookup(this).name.value,
        hideDataOnInput: true,
        clickIcon: 'search',
        click: (p) => {
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Patient, {
              onClear: () => this.value = '',
              onSelect: l => this.value = l.id.value,
              searchColumn: l => l.name
            }));
        }
      })
    });
  }
}
