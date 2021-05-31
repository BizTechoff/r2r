import { Context, DateTimeColumn, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { Roles } from "../../users/roles";
import { UserId } from "../../users/users";
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
    createdBy = new UserId(this.context, { defaultValue: '' });
    modified = new DateTimeColumn({});
    modifiedBy = new UserId(this.context, { defaultValue: '' });
    constructor(private context: Context) {
        super({
            name: "driversCalls",
            allowApiCRUD: [Roles.admin, Roles.usher],
            saving: async () => {
                if (context.onServer) {
                    if (this.isNew()) {
                        this.created.value = new Date();
                        this.createdBy.value = this.context.user.id;
                    } else {
                        this.modified.value = new Date();
                        this.modifiedBy.value = this.context.user.id;
                    }
                }
            },
        });
    }
}