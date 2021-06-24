import { BoolColumn, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { TimeColumn, TODAY } from "../../shared/types";
import { addDays } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { DriverIdColumn } from "./driver";

@EntityClass
export class RegisterDriver extends IdEntity {

    date = new DateColumn();
    rid = new StringColumn({});
    rrid = new StringColumn({});
    did = new DriverIdColumn({ caption: 'Driver' }, this.context);
    fh = new TimeColumn({ caption: 'Pickup From' });
    th = new TimeColumn({ caption: 'Pickup Till' });
    seats = new NumberColumn({
        caption: 'Free Seats',
        validate: () => {
            if (!(this.seats.value > 0)) {
                this.validationError = "Free Seats: at least 1";
            }
        },
    });
    done = new BoolColumn({ defaultValue: false });
    created = new DateTimeColumn({});
    modified = new DateTimeColumn({});

    constructor(private context: Context) {
        super({
            name: "driversRegisters",
            allowApiCRUD: [Roles.usher, Roles.admin, Roles.driver],// todo: Manager only
            allowApiRead: c => c.isSignedIn(),
            saving: async () => {
                if (context.onServer) {
                    if (this.isNew()) {
                        this.created.value = addDays(TODAY, undefined, false);
                    }
                    else {
                        this.modified.value = addDays(TODAY, undefined, false);
                    }
                }
            },
        });
    };

    hasRideId() {
        return this.rid.value && this.rid.value.length > 0;
    }

    hasRideRegisterId() {
        return this.rrid.value && this.rrid.value.length > 0;
    }

    isHasFromHour() {
        return this.fh && this.fh.value && this.fh.value.length > 0 && (!(this.fh.value === TimeColumn.Empty || this.fh.value === '--:--'));
    }

    isHasToHour() {
        return this.th && this.th.value && this.th.value.length > 0 && (!(this.th.value === TimeColumn.Empty));
    }

}
