import { Context, EntityClass, IdEntity, ServerFunction, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { DriverRidesComponent } from "../drivers/driver-rides/driver-rides.component";
import { LocationIdColumn } from "../locations/location";
import { Ride } from "../rides/ride";
import { addDays } from "../usher/ByDate";
import { Location } from "../locations/location";
import { Utils } from "../../shared/utils";


@EntityClass
export class Patient extends IdEntity {

    name = new StringColumn({});
    hebName = new StringColumn({});
    mobile = new StringColumn({});
    idNumber = new StringColumn({});
    defaultBorderCrossing? = new LocationIdColumn(this.context, "Default Border Crossing", "defaultBorderCrossing");
    defaultHospital? = new LocationIdColumn(this.context, "Default Hospital", "defaultHospital");

    constructor(private context: Context) {
        super({
            name: "patients",
            allowApiCRUD: c => c.isSignedIn(), //[Roles.matcher],
            allowApiRead: c => c.isSignedIn(),
            defaultOrderBy:()=>this.name
        });
    }
    
  @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
  static async getRegisteredRidesForPatient(patientId: string, context?: Context) {
    let result: rides4PatientRow[] = [];

    let today = await Utils.getServerDate();
    let tomorrow = addDays(1);
    let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
    let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

    for await (const ride of context.for(Ride).iterate({
      where: r => (r.date.isGreaterOrEqualTo(todayDate))
        .and(r.patientId.isEqualTo(patientId)),
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

      let row: rides4PatientRow = {
        id: ride.id.value,
        date: ride.date.value,
        status: (ride.status.value?ride.status.value.caption:""),
        statusDate: ride.statusDate.value,
        from: (await context.for(Location).findId(ride.from.value)).name.value,
        to: (await context.for(Location).findId(ride.to.value)).name.value,
        passengers: 1 + ride.escortsCount.value,//patient+escorts
        phones: phones,
        isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
        isWaitingForStart: ride.isWaitingForStart(),
        isWaitingForPickup: ride.isWaitingForPickup(),
        isWaitingForArrived: ride.isWaitingForArrived(),
      };
      result.push(row);
    }
    return result;
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
export interface rides4PatientRow {
    id: string,
    date: Date,
    from: string,
    to: string,
    passengers: number,
    phones: string,
    status: string,
    statusDate: Date,
    isWaitingForUsherApproove: boolean,
    isWaitingForStart: boolean,
    isWaitingForPickup: boolean,
    isWaitingForArrived: boolean,
  
    // status: string, 
    // status: (id: string) => void,
  };
  