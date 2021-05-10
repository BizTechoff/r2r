import { Context, DateColumn, EntityClass, IdEntity, NumberColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
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

    constructor(private context: Context) {
        super({
            name: "ridesRegisters",
            allowApiCRUD: [Roles.usher, Roles.admin],// todo: Manager only
            allowApiRead: c => c.isSignedIn(),

            // saving: async () => {
            //     if (context.onServer) {
            //         if (this.isNew()) {
            //             await openHowManyToCreate()
            //          }
            //     }
            // },
        });
    }
}
