import { Context, DateTimeColumn, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { Roles } from "../../users/roles";
import { DriverIdColumn } from "./driver";

@EntityClass
export class DriverCall extends IdEntity {
    dId = new DriverIdColumn({ caption: 'Driver' }, this.context);
    doc = new StringColumn({
        caption: 'Documentation', validate: () => {
            if (!this.doc.value)
                this.doc.validationError = " Is Too Short";
        },
    });
    created = new DateTimeColumn({});
    modified = new DateTimeColumn({});
    constructor(private context: Context) {
        super({
            name: "driversCalls",
            allowApiCRUD: [Roles.admin, Roles.usher],
            saving: async () => {
                if (context.onServer) {
                    if (this.isNew()) {
                        this.created.value = new Date();
                    } else {
                        this.modified.value = new Date();
                    }
                }
            },
        });
    }
}