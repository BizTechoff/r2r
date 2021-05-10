import { DateColumn, EntityClass, IdEntity, NumberColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { LocationIdColumn } from "../../locations/location";

@EntityClass
export class RegisterRide extends IdEntity {

    date = new DateColumn({});
    from = new LocationIdColumn({});
    to = new LocationIdColumn({});
    passengers = new NumberColumn({});

    constructor() {
        super({
            name: "ridesRegisters",
            allowApiCRUD: Roles.usher,// todo: Manager only
            allowApiRead: c => c.isSignedIn(),
        });
    }
}
