import { Context, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { LocationIdColumn, Location } from "../locations/location";
import { DriverIdColumn } from "./driver";
import { DayOfWeekColumn, DayPeriodColumn } from "./driverPrefSchedule";

@EntityClass
export class DriverPrefs extends IdEntity {

    driverId = new DriverIdColumn(this.context, "Driver", "driverId");
    locationId = new LocationIdColumn(this.context, "Location", "locationId");//fk

    dayOfWeek = new DayOfWeekColumn();
    dayPeriod = new DayPeriodColumn();
    
    constructor(private context: Context) {
        super({
            name: "driversPrefs",
            allowApiCRUD: c => c.isSignedIn(),// [Roles.driver, Roles.admin],
            allowApiRead: c => c.isSignedIn(),
        });
    }

    async getLocationName() {
        var result = "";
        if (this.locationId && this.locationId.value) {
            var location = await this.context.for(Location).findId(
                this.locationId.value);
            if (location) {
                result = location.name.value;
            }
        }
        return result;
    }
}



// export class DriverPrefsIdColumn extends StringColumn {

//     constructor(private context: Context, caption: string, dbName: string) {
//         super({
//             caption: caption,
//             dbName: dbName,
//             dataControlSettings: () => ({
//                 getValue: () => this.context.for(DriverPrefs).lookup(this).name.value,
//                 hideDataOnInput: true,
//                 clickIcon: 'search',
//                 click: () => {
//                     this.context.openDialog(DynamicServerSideSearchDialogComponent,
//                         x => x.args(DriverPrefs, {
//                             onSelect: l => this.value = l.id.value,
//                             searchColumn: l => l.name
//                         }));
//                 }
//             })
//         });
//     }
// }
