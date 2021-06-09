import { Context, EntityClass, IdEntity } from "@remult/core";
import { Roles } from "../../users/roles";
import { LocationIdColumn } from "../locations/location";
import { DriverIdColumn } from "./driver";

@EntityClass
export class DriverPrefs extends IdEntity {

    did = new DriverIdColumn({}, this.context);
    lid = new LocationIdColumn({ allowNull: true }, this.context);

    constructor(private context: Context) {
        super({
            name: "driversPrefs",
            allowApiInsert: [Roles.driver, Roles.usher, Roles.admin],
            allowApiUpdate: [Roles.driver, Roles.usher, Roles.admin],
            allowApiDelete: false,
            allowApiRead: c => c.isSignedIn()
        });
    }

}
