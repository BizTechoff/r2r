import { Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
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
  home?= new LocationIdColumn(this.context, true);
  email = new StringColumn({});
  seats = new NumberColumn({
    defaultValue: 3,
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
  defaultFromTime = new StringColumn({ defaultValue: "00:00" });
  defaultToTime = new StringColumn({ defaultValue: "00:00" });

  lastStatus = new RideStatusColumn({});
  lastStatusDate = new DateColumn({});

  constructor(private context: Context) {
    super({
      name: "drivers",
      allowApiCRUD: Roles.usher,// c => c.isSignedIn(),// [Roles.driver, Roles.admin],
      allowApiUpdate: Roles.driver,
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
      return this.birthDate && this.birthDate.value && this.birthDate.value.getFullYear() > 1900;
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

}


export class DriverIdColumn extends StringColumn {
  getName() {
    return this.context.for(Driver).lookup(this).name.value;
  }
  async getValueName() {
    return (await this.context.for(Driver).findId(this.value)).name.value;
  }
  constructor(private context: Context) {
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
    });
  }
}
