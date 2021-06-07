import { BoolColumn, ColumnSettings, Context, EntityClass, IdEntity, ValueListColumn } from "@remult/core";
import { Roles } from "../../users/roles";
import { Location, LocationIdColumn } from "../locations/location";
import { DriverIdColumn } from "./driver";

@EntityClass
export class DriverPrefs extends IdEntity {

    driverId = new DriverIdColumn({}, this.context);
    locationId = new LocationIdColumn({ allowNull: true }, this.context);
    fBorder = new BoolColumn({ caption: 'From Border' });
    tBorder = new BoolColumn({ caption: 'To Border' });
    active = new BoolColumn({ caption: 'Active?', defaultValue: true });

    constructor(private context: Context, oblyActive = true) {
        super({
            name: "driversPrefs",
            allowApiInsert: [Roles.driver, Roles.usher, Roles.admin],
            allowApiUpdate: [Roles.driver, Roles.usher, Roles.admin],
            allowApiDelete: false,
            allowApiRead: c => c.isSignedIn(),
            fixedWhereFilter: () => {
                if (oblyActive) {
                    return this.active.isEqualTo(true);
                }
            }
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


export class DayPeriod {
    static morning = new DayPeriod();
    static afternoon = new DayPeriod('red');
    // static both = new DayPeriod('red');
    constructor(public color = 'green') { }
    id;
}
