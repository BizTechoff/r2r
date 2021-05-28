import { ColumnSettings, Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { LocationIdColumn } from "../locations/location";

@EntityClass
export class Patient extends IdEntity {

  name = new StringColumn({});
  hebName = new StringColumn({});
  mobile = new StringColumn({});
  idNumber = new StringColumn({});
  birthDate?= new DateColumn({
    allowNull: true,
    valueChange: () => {
      if (this.birthDate.value) {
        let y1 = new Date().getFullYear();
        let y2 = this.birthDate.value.getFullYear();
        this.age.value = y1 - y2;
      }
      else{
        this.age.value = 0;
      }
    },
  });
  remark = new StringColumn({});
  age = new NumberColumn({ caption: 'Age' });

  defaultBorder?= new LocationIdColumn({allowNull: true}, this.context);
  defaultHospital?= new LocationIdColumn({allowNull: true}, this.context);

  constructor(private context: Context) {
    super({
      name: "patients",
      allowApiCRUD: c => c.isSignedIn(), //[Roles.matcher],
      allowApiRead: c => c.isSignedIn(),
      defaultOrderBy: () => this.name
    });
  }

  hasBirthDate() {
    return this.birthDate && this.birthDate.value && this.birthDate.value.getFullYear() > 1900;
  }

  private calcAge(today?: Date) {
    today = new Date();
    if (this.hasBirthDate())
      return today.getFullYear() - this.birthDate.value.getFullYear();
    return 0;
    if (!(this.hasBirthDate())) {
      return 0;
    }
    if (!(today)) {
      //  today = await Utils.getServerDate();
    }
    let age = today.getFullYear() - this.birthDate.value.getFullYear();
    return age;
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
              onSelect: l => this.value = l.id.value,
              searchColumn: l => l.name
            }));
        }
      })
    });
  }
}

// export async function openPatient(pid: string, context: Context): Promise<boolean> {
//   await context.openDialog(PatientCrudComponent, thus => thus.args = {
//     pid: pid, isNew: false,
//  });
//  return true;
//   //let result:UsherRideRow = {};
//   // let p = await context.for(Patient).findId(pid);
//   // if (p) {


//   //   await context.openDialog(PatientCrudComponent, thus => thus.args = {
//   //      pid: pid, isNew: false,
//   //   });

//   //   // context.openDialog(
//   //   //   InputAreaComponent,
//   //   //   x => x.args = {
//   //   //     title: `Edit Patient: ${p.name.value}`,
//   //   //     columnSettings: () => [
//   //   //       [p.name, p.hebName],
//   //   //       [p.mobile, p.idNumber],
//   //   //       [p.defaultBorder, p.defaultHospital],
//   //   //     ],
//   //   //     ok: async () => {
//   //   //       if (p.wasChanged()) {
//   //   //         await p.save();
//   //   //         // r.pName = p.name.value;
//   //   //         // r.pAge = p.age();
//   //   //         // r.pMobile = p.mobile.value;
//   //   //         return true;
//   //   //       }
//   //   //     }
//   //   //   },
//   //   // )
//   // }
//   // return false;
// }
