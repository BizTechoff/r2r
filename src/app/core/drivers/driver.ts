import { Context, DateColumn, EntityClass, IdEntity, NumberColumn, ServerFunction, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { Utils } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { LocationIdColumn } from "../locations/location";
import { Patient } from "../patients/patient";
import { Ride, RideStatus, RideStatusColumn } from "../rides/ride";
import { addDays } from "../usher/ByDate";
import { DriverRidesComponent } from "./driver-rides/driver-rides.component";
import { Location } from "../locations/location";
import { DriverPrefs } from "./driverPrefs";

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
    home?= new LocationIdColumn(this.context, "Home", "home", true);
    email = new StringColumn({});
    seats = new NumberColumn({
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
            allowApiCRUD: c => c.isSignedIn(),// [Roles.driver, Roles.admin],
            allowApiRead: c => c.isSignedIn(),

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

    isWaitingForDriverAccept(){
        return this.lastStatus.value === RideStatus.waitingFor10DriverAccept;
    }

    isWaitingForUsherApproove(){
        return this.lastStatus.value === RideStatus.waitingFor20UsherApproove;
    }

    isWaitingForStart(){
        return this.lastStatus.value === RideStatus.waitingFor30Start;
    }

    isWaitingForPickup(){
        return this.lastStatus.value === RideStatus.waitingFor40Pickup;
    }

    isWaitingForArrived(){
        return this.lastStatus.value === RideStatus.waitingFor50Arrived;
    }
    

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveRegisteredRides(driverId: string, context?: Context) {
    let result: rides4Driver[] = [];

    let today = await Utils.getServerDate();
    let tomorrow = addDays(1);
    let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
    let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

    for await (const ride of context.for(Ride).iterate({
      where: r => (r.date.isGreaterOrEqualTo(todayDate))
        .and(r.status.isDifferentFrom(RideStatus.waitingFor10DriverAccept))
        .and(r.driverId.isEqualTo(driverId)),
      orderBy: r => [{ column: r.date, descending: false }],
    })) {

      // Build Row
      let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

      let date = rDate.getTime() === todayDate.getTime()
        ? "Today"
        : rDate.getTime() === tomorrowDate.getTime()
          ? "Tomorrow"
          : rDate.toDateString;
      let period = ride.dayPeriod.value.id;
      let title = `${date} - ${period}`;

      let icons: string[] = [];
      if (ride.isNeedWheelchair.value) {
        icons.push("accessible");
      }
      if (ride.isHasExtraEquipment.value) {
        icons.push("home_repair_service");
      }

      let phones = "";
      let p = await context.for(Patient).findId(ride.patientId.value);
      if (p && p.mobile && p.mobile.value) {
        phones = p.mobile.value;
      }

      let row: rides4DriverRow = {
        id: ride.id.value,
        from: (await context.for(Location).findId(ride.from.value)).name.value,
        to: (await context.for(Location).findId(ride.to.value)).name.value,
        passengers: 1 + ride.escortsCount.value,//patient+escorts
        icons: icons,
        phones: phones,
        isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
        isWaitingForStart: ride.isWaitingForStart(),
        isWaitingForPickup: ride.isWaitingForPickup(),
        isWaitingForArrived: ride.isWaitingForArrived(),
      };

      let group = result.find(grp => grp.title === title);
      if (!(group)) {
        group = { title: title, rows: [] };
        result.push(group);
      }
      group.rows.push(row);
    }
    return result;
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveSuggestedRides(driverId: string, context?: Context) {
    let result: rides4Driver[] = [];

    let today = await Utils.getServerDate();
    let tomorrow = addDays(1);
    let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
    let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

    let locationsIds: string[] = [];
    for await (const pf of context.for(DriverPrefs).iterate({
      where: pf => pf.driverId.isEqualTo(driverId),
    })) {
      locationsIds.push(pf.locationId.value);
    };

    if (locationsIds.length > 0) {

      for await (const ride of context.for(Ride).iterate({
        where: r => (r.date.isGreaterOrEqualTo(todayDate))//dates
          .and(r.status.isEqualTo(RideStatus.waitingFor10DriverAccept))//status
          .and(r.from.isIn(...locationsIds).or(r.to.isIn(...locationsIds))),//locations
      })) {

        // Build Row
        let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

        let date = rDate.getTime() === todayDate.getTime()
          ? "Today"
          : rDate.getTime() === tomorrowDate.getTime()
            ? "Tomorrow"
            : rDate.toDateString;
        let period = ride.dayPeriod.value.id;
        let title = `${date} - ${period}`;

        let icons: string[] = [];
        if (ride.isNeedWheelchair.value) {
          icons.push("accessible");
        }
        if (ride.isHasExtraEquipment.value) {
          icons.push("home_repair_service");
        }

        let row: rides4DriverRow = {
          id: ride.id.value,
          from: (await context.for(Location).findId(ride.from.value)).name.value,
          to: (await context.for(Location).findId(ride.to.value)).name.value,
          passengers: 1 + ride.escortsCount.value,//patient+escorts
          icons: icons,
          phones: "",
          isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
          isWaitingForStart: ride.isWaitingForStart(),
          isWaitingForPickup: ride.isWaitingForPickup(),
          isWaitingForArrived: ride.isWaitingForArrived(),
        };

        let group = result.find(grp => grp.title === title);
        if (!(group)) {
          group = { title: title, rows: [] };
          result.push(group);
        }
        group.rows.push(row);
      }
    }
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
    constructor(private context: Context, caption: string, dbName: string) {
        super({
            caption: caption,
            dbName: dbName,
            dataControlSettings: () => ({
                getValue: () => this.getName(),
                hideDataOnInput: true,
                clickIcon: 'search',
                click: (d) => {
                    this.context.openDialog(DynamicServerSideSearchDialogComponent,
                        x => x.args(Driver, {
                            onSelect: l => this.value = l.id.value,
                            searchColumn: l => l.name
                        }));
                }
            })
        });
    }
}


export interface rides4DriverRow {
    id: string,
    from: string,
    to: string,
    passengers: number,
    icons: string[],
    phones: string,
  
    isWaitingForUsherApproove: boolean,
    isWaitingForStart: boolean,
    isWaitingForPickup: boolean,
    isWaitingForArrived: boolean,
  
    // status: string, 
    // status: (id: string) => void,
  };
  export interface rides4Driver {
    title: string,
    rows: rides4DriverRow[],
  };
  