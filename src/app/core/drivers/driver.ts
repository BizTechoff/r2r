import { checkForDuplicateValue, ColumnSettings, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { DialogService } from "../../common/dialog";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { GridDialogComponent } from "../../common/grid-dialog/grid-dialog.component";
import { InputAreaComponent } from "../../common/input-area/input-area.component";
import { NOT_FOUND_DAYS, TimeColumn } from "../../shared/types";
import { addDays, daysDiff } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { UserId, Users } from "../../users/users";
import { LocationIdColumn } from "../locations/location";
import { Ride, RideStatus, RideStatusColumn } from "../rides/ride";

@EntityClass
export class Driver extends IdEntity {

  uid = new UserId(this.context);// The user-table will be the driver.
  name = new StringColumn({
    validate: () => {
      if (!this.name.value)
        this.name.validationError = " Is Too Short";
    },
  });
  hebName = new StringColumn({});
  mobile = new StringColumn({});
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
  lastStatusDate = new DateTimeColumn({});
  defaultFromLocation?= new LocationIdColumn(this.context, { allowNull: true });
  defaultToLocation?= new LocationIdColumn(this.context, { allowNull: true });
  defaultFromTime = new TimeColumn();
  defaultToTime = new TimeColumn();
  freezeTillDate = new DateColumn({ caption: 'Driver Freezed Last Date' });

  constructor(private context: Context, private dialog: DialogService) {
    super({
      name: "drivers",
      allowApiDelete: false,
      allowApiInsert: false,
      allowApiUpdate: [Roles.admin, Roles.usher, Roles.driver],
      defaultOrderBy: () => this.name,
      allowApiRead: c => c.isSignedIn(),
      // apiDataFilter: () => { return this.uid.isDifferentFrom(''); },
      saving: async () => {
        if (context.onServer) {
          await checkForDuplicateValue(this, this.mobile, this.context.for(Driver));
        }
      },
      saved: async () => {
        if (context.onServer) {
          if (this.mobile.wasChanged() || this.name.wasChanged()) {
            let u = await context.for(Users).findId(this.uid);
            if (!(u)) {
              throw new Error("You are not register to system");
            }
            let changed = false;
            changed = changed || (this.name.value !== u.name.value);
            changed = changed || (this.mobile.value !== u.mobile.value);
            if (changed) {
              u.name.value = this.name.value;
              u.mobile.value = this.mobile.value;
              await u.save();
            }
          }
        }
      }
    })
  }

  hasHome() {
    return this.home && this.home.value && this.home.value.length > 0
      ? true
      : false;
  }

  hasName() {
    return this.name && this.name.value && this.name.value.length > 0
      ? true
      : false;
  }

  hasCity() {
    return this.city && this.city.value && this.city.value.length > 0
      ? true
      : false;
  }

  hasMobile() {
    return this.mobile && this.mobile.value && this.mobile.value.length > 0
      ? true
      : false;
  }

  hasSeats() {
    return this.seats && this.seats.value && this.seats.value > 0
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
    return this.lastStatus.value === RideStatus.w4_Driver;
  }

  isWaitingForStart() {
    return this.lastStatus.value === RideStatus.w4_Start;
  }

  isWaitingForPickup() {
    return this.lastStatus.value === RideStatus.w4_Pickup;
  }

  isWaitingForArrived() {
    return this.lastStatus.value === RideStatus.w4_Arrived;
  }

  async sendMessage() {
    let message = 'הי משה – כאן X ממרכז התאום, צוותה לך נסיעה היום חמישי לחמשי שמונה בבקר מתרקומיה לשיבא, 4 נוסעים, אחמד ויסמין. טלפון של החולים – הכל מחכה לך במערכת, לחץ כאן.';
    console.log(`Send message to patient: ${message}`);
  }

}


export class DriverIdColumn extends StringColumn {
  selected: Driver = undefined;
  constructor(options?: ColumnSettings<string>, private context?: Context) {
    super({
      valueChange: async () => {
        // console.log('DriverIdColumn.valueChange');
        if (this.value && this.value.length > 0) {
          this.selected = await this.context.for(Driver).findId(this.value);
        }
        else {
          this.selected = undefined;
        }
      },
      dataControlSettings: () => ({
        getValue: () => {
          return this.selected
            ? this.selected.name.value
            : this.context.for(Driver).lookup(this).name.value;
          // this.selected = this.context.for(Driver).lookup(this).name.value;
          // return this.selected.name.value;
        },
        hideDataOnInput: true,
        clickIcon: 'search',
        click: (d) => {
          this.context.openDialog(DynamicServerSideSearchDialogComponent,
            x => x.args(Driver, {
              onClear: () => this.value = '',
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
          [d.name, d.idNumber],
          [d.mobile, d.seats],
          d.birthDate,
          d.email,
          [d.city, d.address],
          { column: d.freezeTillDate, readOnly: true, visible: () => { return d.hasFreezeDate(); } },
        ],
        buttons: [
          {
            text: 'Send Message',
            click: async () => { await d.sendMessage(); }
          }
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

export async function openDriverRides(did: string, context: Context): Promise<number> {
  let result = NOT_FOUND_DAYS;
  let d = await context.for(Driver).findId(did);
  if (d) {
    let pass = new NumberColumn({ caption: 'Pass' });
    await context.openDialog(GridDialogComponent, dlg => dlg.args = {
      title: `${d.name.value} Rides`,
      settings: context.for(Ride).gridSettings({
        where: cur => cur.did.isEqualTo(d.id),
        orderBy: cur => [{ column: cur.date, descending: true }],
        allowCRUD: false,// context.isAllowed([Roles.admin, Roles.usher, Roles.matcher]),
        allowDelete: false,
        // showPagination: false,
        numOfColumnsInGrid: 10,
        columnSettings: cur => [
          cur.pid,
          cur.fid,
          cur.tid,
          cur.date,
          cur.pickupTime,
          { column: pass, getValue: (r) => { return r.passengers(); } },
          cur.status,
        ],
      }),
    });
  }

  // let last = await context.for(Ride).findFirst({
  //   where: cur => cur.did.isEqualTo(did),
  //   orderBy: cur => [{ column: cur.date, descending: true }]
  // });
  // if (last) {
  //   result = daysDiff(addDays(), last.date.value);
  // }
  return result;
}
