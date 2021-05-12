import { DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { LocationIdColumn } from "../../locations/location";
import { DriverIdColumn } from "../driver";

@EntityClass
export class RegisterDriver extends IdEntity {

    regRideId = new StringColumn({});
    driverId = new DriverIdColumn({});
    seats = new NumberColumn({caption: 'Free Seats', validate: () => {if(!(this.seats.value >0)){
        this.validationError = "Free Seats: at least 1";
    } }});
    fromHour = new StringColumn({caption: 'Avaliable From Hour'});
    toHour = new StringColumn({caption: 'Avaliable Till Hour'});

    constructor() {
        super({
            name: "driversRegisters",
            allowApiCRUD: [Roles.usher, Roles.admin, Roles.driver],// todo: Manager only
            allowApiRead: c => c.isSignedIn(),
        });
    }
}
