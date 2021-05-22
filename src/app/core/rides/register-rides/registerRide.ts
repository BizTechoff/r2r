import { Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { DriverIdColumn } from "../../drivers/driver";
import { LocationIdColumn } from "../../locations/location";

@EntityClass
export class RegisterRide extends IdEntity {

    date = new DateColumn({
        validate: () => {
            if (!(this.date.value)) {
                this.validationError = " Date Required";
            }
        }
    });
    fromLoc = new LocationIdColumn({}, this.context);
    toLoc = new LocationIdColumn({}, this.context);
    passengers = new NumberColumn({
        validate: () => {
            if (this.passengers.value == 0) {
                this.validationError = " Passengers Required";
            }
        } 
    });
    approvedDId? = new DriverIdColumn({caption: 'Approved Driver'}, this.context);
    approvedDate? = new DateTimeColumn({});

    constructor(private context: Context) {
        super({
            name: "ridesRegisters",
            allowApiCRUD: [Roles.usher, Roles.admin],// todo: admin only
            allowApiRead: c => c.isSignedIn(),
        });
    }
}
