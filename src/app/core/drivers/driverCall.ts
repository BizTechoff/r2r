import { Context, DateTimeColumn, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { GridDialogComponent } from "../../common/grid-dialog/grid-dialog.component";
import { TODAY } from "../../shared/types";
import { addDays } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { UserId } from "../../users/users";
import { Driver, DriverIdColumn } from "./driver";

@EntityClass
export class DriverCall extends IdEntity {
    dId = new DriverIdColumn({ caption: 'Driver' }, this.context);
    doc = new StringColumn({
        caption: 'Conversation content', validate: () => {
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
                        this.created.value = addDays(TODAY, undefined, false);
                        this.createdBy.value = this.context.user.id;
                    } else {
                        this.modified.value = addDays(TODAY, undefined, false);
                        this.modifiedBy.value = this.context.user.id;
                    }
                }
            },
        });
    }

    static async openCallDocumentationDialog(context: Context, did: string, dname?: string) {
        if (!(dname)) {
            dname = (await context.for(Driver).findId(did)).name.value;
        }
        await context.openDialog(GridDialogComponent, gd => gd.args = {
            title: `Call Documentation For ${dname}`,
            settings: context.for(DriverCall).gridSettings({
                where: c => c.dId.isEqualTo(did),
                orderBy: c => [{ column: c.modified.value ? c.modified : c.created, descending: true }, { column: c.created.value ? c.created : c.modified, descending: true }],
                newRow: c => { c.dId.value = did; },
                allowCRUD: context.isAllowed([Roles.admin, Roles.usher]),
                allowDelete: false,
                numOfColumnsInGrid: 10,
                columnSettings: c => [
                    c.doc,
                    { column: c.createdBy, readOnly: true },
                    { column: c.created, readOnly: true },
                    { column: c.modified, readOnly: true },
                    { column: c.modifiedBy, readOnly: true },
                ],
            }),
        });
    }
}
