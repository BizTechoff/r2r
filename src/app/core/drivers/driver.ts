import { ColumnSettings, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { DialogService } from "../../common/dialog";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { InputAreaComponent } from "../../common/input-area/input-area.component";
import { Utils } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { LocationIdColumn } from "../locations/location";
import { RideStatus, RideStatusColumn } from "../rides/ride";
import { addDays } from "../usher/usher";

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
  home?= new StringColumn({});
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
  defaultFromTime = new StringColumn({defaultValue: '00:00'});//{ defaultValue: "00:00", dataControlSettings: () => ({ inputType: 'time', width: '110' }) });
  defaultToTime = new StringColumn({defaultValue: '00:00'});//{ defaultValue: "00:00", dataControlSettings: () => ({ inputType: 'time', width: '110' }) });
  defaultSeats = new NumberColumn({defaultValue: 1});
  freezeTillDate?= new DateColumn({});

  constructor(private context: Context, private dialog: DialogService) {
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

  hasHome() {
    return this.home && this.home.value && this.home.value.length > 0
      ? true
      : false;
  }

  hasMobile() {
    return this.mobile && this.mobile.value && this.mobile.value.length > 0
      ? true
      : false;
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

  async freeze(): Promise<boolean> {
    let result = false;
    let today = new Date();
    let endOfMonth = addDays(-1, new Date(today.getFullYear(), today.getMonth() + 1, 1));

    let freezeDate = new DateColumn({ defaultValue: endOfMonth });
    await this.context.openDialog(InputAreaComponent, ia => ia.args = {
      title: `Freeze Driver: ${this.name.value}`,
      columnSettings: () => [
        {
          column: freezeDate,
          caption: 'Till Date',
        },
      ],
      validate: async () => {
        let ok = freezeDate && freezeDate.value && (freezeDate.value > new Date());
        if (!(ok)) {
          this.validationError = 'Date must be greater then today';
          throw this.validationError;
        }
      },
      ok: async () => {
        if (freezeDate.value) {
          this.freezeTillDate.value = freezeDate.value;
          await this.save();
          result = true;
        }
      },
    });
    return result;
  }
 
  async unfreeze(): Promise<boolean> {
    let result = false;
    // let yes = await this.dialog.yesNoQuestion(`Unfreeze driver ${this.name.value}`);
    // if (yes) {
      this.freezeTillDate.value = null;
      await this.save();
      console.log('@#@#@#@#');
      result = true;
    // }
    return result;
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
          {column: d.freezeTillDate, readOnly: true, visible: () => {return (!(d.freezeTillDate.value === null));} },
        ],
        buttons: [
          {
            text: 'Send Message',
            click: async () => { await d.sendMessage(); }
          },
          {
            text: (d.freezeTillDate.value ? 'Unfreeze Driver' : 'Freeze Driver'),
            click: async () => {
              let changed = (d.freezeTillDate.value ? await d.unfreeze() : await d.freeze());
              if (changed) {
                // this.
              }
            }
          },
        ],
        ok: async () => {
          if (d.wasChanged()) {
            await d.save();
            return true;
          }
        },
        
      },
    )
  }
  return false;
}
