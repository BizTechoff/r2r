import { Context, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { LocationIdColumn } from "../locations/location";

@EntityClass
export class DriverPrefs extends IdEntity{
    
    driverId = new StringColumn({});
    locationId = new LocationIdColumn(this.context, "Location","locationId");//fk

    constructor(private context: Context) {
        super({
            name: "driversPrefs",
            allowApiCRUD: c => c.isSignedIn(),// [Roles.driver, Roles.admin],
            allowApiRead: c => c.isSignedIn(),
        });
    }
}
