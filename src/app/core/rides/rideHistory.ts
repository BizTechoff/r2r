import { Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { Roles } from "../../users/roles";
import { UserId } from "../../users/users";
import { RideIdColumn, RideStatusColumn } from "./ride";

@EntityClass
export class RideHistory extends IdEntity {

    rid = new RideIdColumn(this.context);
    date = new DateColumn();
    // visitTime = new StringColumn({defaultValue: '00:00', inputType: 'time'});
    pickupTime = new StringColumn({ defaultValue: '00:00', inputType: 'time' });
    status = new RideStatusColumn();
    // escortsCount = new NumberColumn({});
    // fid = new LocationIdColumn({},this.context);
    // tid = new LocationIdColumn({},this.context);
    // pid = new PatientIdColumn(this.context);
    // did = new DriverIdColumn({},this.context);
    changed = new DateTimeColumn();
    changedBy = new UserId(this.context);

    constructor(private context: Context) {
        super({
            name: 'ridesHistory',
            allowApiInsert: [Roles.matcher, Roles.usher, Roles.admin],
            allowApiUpdate: false,
            allowApiDelete: false,
            allowApiRead: [Roles.matcher, Roles.usher, Roles.admin],

            saving: async () => {
                if (context.onServer) {
                    if (this.isNew()) {
                        this.changed.value = new Date();
                        this.changedBy.value = this.context.user.id;
                    }
                }
            },
        });
    }
}