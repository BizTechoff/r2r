import { DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { LocationIdColumn } from "../../locations/location";
import { DriverIdColumn } from "../driver";

@EntityClass
export class RegisterDriver extends IdEntity {

    regRideId = new StringColumn({});
    driverId = new DriverIdColumn({});
    seats = new NumberColumn({});
    fromHour = new DateTimeColumn({});
    toHour = new DateTimeColumn({});

    constructor() {
        super({
            name: "driversRegisters",
            allowApiCRUD: Roles.usher,// todo: Manager only
            allowApiRead: c => c.isSignedIn(),
        });
    }
}
