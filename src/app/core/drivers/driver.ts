import { BoolColumn, ColumnSettings, Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { InputAreaComponent } from "../../common/input-area/input-area.component";
import { Utils } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { LocationIdColumn } from "../locations/location";
import { RideStatus, RideStatusColumn } from "../rides/ride";

@EntityClass
export class Driver extends IdEntity {

  userId = new StringColumn({});// The user-table will be the driver.
  name = new StringColumn({
    validate: () => {
      if (!this.name.value)
        this.name.validationError = " Is Too Short";
    },
  });
  hebName = new StringColumn({});
  mobile = new StringColumn({
    dataControlSettings: () => ({
      // getValue: (r => Utils.fixMobile(r.mobile.value)),
    }),
    inputType: "tel",

    validate: () => {
      if (!this.mobile.value) {
        // this.mobile.value = "0"
        // this.mobile.validationError = " Is Too Short";
      }
      else if (!Utils.isValidMobile(this.mobile.value)) {
        this.mobile.validationError = " Not Valid";
      }
      else {
        this.mobile.value = Utils.fixMobile(this.mobile.value);
      }
    },
  });
  home?= new LocationIdColumn({}, this.context, true);
  email = new StringColumn({});
  seats = new NumberColumn({
    defaultValue: 4,
    validate: () => {
      if (this.seats.value <= 0) {
        this.seats.value = 1;
      }
    },
  });
  idNumber = new StringColumn({});
  birthDate = new DateColumn({});
  city = new StringColumn({});
  address = new StringColumn({});

  lastStatus = new RideStatusColumn({});
  lastStatusDate = new DateColumn({});
  defaultFromLocation?= new LocationIdColumn({}, this.context, true);
  defaultToLocation?= new LocationIdColumn({}, this.context, true);
  defaultFromTime = new StringColumn({ defaultValue: "00:00", dataControlSettings: () => ({ inputType: 'time', width: '110' }) });
  defaultToTime = new StringColumn({ defaultValue: "00:00", dataControlSettings: () => ({ inputType: 'time', width: '110' }) });
  defaultSeats = new NumberColumn({});
  isFreeze = new BoolColumn({});
  freezeTillDate = new DateColumn({});

  constructor(private context: Context) {
    super({
      name: "drivers",
      allowApiCRUD: [Roles.usher, Roles.admin],// c => c.isSignedIn(),// [Roles.driver, Roles.admin],
      allowApiUpdate: [Roles.driver, Roles.admin],
      allowApiRead: c => c.isSignedIn(),
      allowApiDelete: false,

      // allowApiDelete:false,
      // saving:async()=>{
      //     if (context.onServer)
      //     {if(this.isNew())
      //     {if(this.status.value!=this.status.originalValue){
      //     let u  =await  context.for(Users).findId(this.id);
      //     i.status.value = this.status.value;
      //     await u.save();}
      //     }
      //     }

      // },
      // deleting:async()=>{}
    })
  }

  hasBirthDate() {
    return this.birthDate && this.birthDate.value && this.birthDate.value.getFullYear() > 1900
    ? true
    : false;
  }

  hasFreezeDate() {
    return this.freezeTillDate && this.freezeTillDate.value && this.freezeTillDate.value.getFullYear() > 1900
    ? true
    : false;
  }

  isWaitingForDriverAccept() {
    return this.lastStatus.value === RideStatus.waitingForDriver;
  }

  isWaitingForUsherApproove() {
    return this.lastStatus.value === RideStatus.waitingForUsherApproove;
  }

  isWaitingForStart() {
    return this.lastStatus.value === RideStatus.waitingForStart;
  }

  isWaitingForPickup() {
    return this.lastStatus.value === RideStatus.waitingForPickup;
  }

  isWaitingForArrived() {
    return this.lastStatus.value === RideStatus.waitingForArrived;
  }

  async sendMessage() {
    let message = 'הי משה – כאן X ממרכז התאום, צוותה לך נסיעה היום חמישי לחמשי שמונה בבקר מתרקומיה לשיבא, 4 נוסעים, אחמד ויסמין. טלפון של החולים – הכל מחכה לך במערכת, לחץ כאן.';
    console.log(`Send message to patient: ${message}`);
  }

  async freeze() {
    await this.context.openDialog(InputAreaComponent, ia => ia.args = {
      title: `Freeze Driver: ${this.name.value}`,
      columnSettings: () => [
        {
          column: this.freezeTillDate,
          caption: 'Till Date',
        },
      ],
      validate: async () => {
        console.log(this.hasFreezeDate());
        if (!(this.hasFreezeDate() && this.freezeTillDate.value > new Date())) {
          this.validationError = 'Date must be greater then today';
          throw this.validationError;
        }
      },
      ok: async () => {
        this.isFreeze.value = true;
        await this.save();
      },
    });
  }

}


export class DriverIdColumn extends StringColumn {
  getName() {
    return this.context.for(Driver).lookup(this).name.value;
  }
  async getValueName() {
    return (await this.context.for(Driver).findId(this.value)).name.value;
  }
  constructor(options?: ColumnSettings<string>, private context?: Context) {
    super({
      dataControlSettings: () => ({
        getValue: () => this.getName(),
        hideDataOnInput: true,
        clickIcon: 'search',
        click: (d) => {
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Driver, {
              onSelect: d => this.value = d.id.value,
              searchColumn: d => d.name
            }));
        }
      })
    }, options);
  }
}

export async function openDriver(id: string, context: Context): Promise<boolean> {

  let d = await context.for(Driver).findId(id);
  if (d) {

    context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: `Edit Driver: ${d.name.value}`,
        columnSettings: () => [
          [d.name, d.hebName],
          [d.mobile, d.email],
          [d.idNumber, d.birthDate],
          [d.home, d.seats],
          [d.city, d.address],
        ],
        buttons: [
          {
            text: 'Send Message',
            click: async () => { await d.sendMessage(); }
          },
          {
            text: 'Freeze Driver',
            click: async () => { await d.freeze(); }
          },
        ],
        ok: async () => {
          if (d.wasChanged) {
            await d.save();
            return true;
          }
        }
      },
    )
  }
  return false;
}
