import { Context, DateTimeColumn, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { GridDialogComponent } from "../../common/grid-dialog/grid-dialog.component";
import { NOT_FOUND_DAYS, TODAY } from "../../shared/types";
import { addDays, daysDiff, resetTime } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { UserId } from "../../users/users";
import { Driver, DriverIdColumn } from "./driver";

@EntityClass
export class DriverCall extends IdEntity {
    did = new DriverIdColumn({ caption: 'Driver' }, this.context);
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

    static async openCallDocumentationDialog(context: Context, did: string, dname?: string) : Promise<number> {
        let result = NOT_FOUND_DAYS;
        if (!(dname)) {
            dname = (await context.for(Driver).findId(did)).name.value;
        }
        await context.openDialog(GridDialogComponent, dlg => dlg.args = {
            title: `Call Documentation For ${dname}`,
            settings: context.for(DriverCall).gridSettings({
                where: cur => cur.did.isEqualTo(did),
                orderBy: cur => [{ column: cur.created, descending: true }, { column: cur.modified, descending: true }],
                newRow: cur => { cur.did.value = did; },
                allowCRUD: context.isAllowed([Roles.admin, Roles.usher]),
                allowDelete: false,
                numOfColumnsInGrid: 10,
                columnSettings: c => [
                    c.doc,
                    { column: c.created, readOnly: true },
                    { column: c.createdBy, readOnly: true },
                    // { column: c.modified, readOnly: true },
                    // { column: c.modifiedBy, readOnly: true },
                ],
                gridButtons: [
                    {
                        textInMenu: () => 'Add Call',
                        click: () => dlg.args.settings.addNewRow()
                    }
                ]
            }),
        });
        let last = await context.for(DriverCall).findFirst({
            where: cur=>cur.did.isEqualTo(did),
            orderBy: cur => [{column: cur.created, descending: true}]
        });
        if(last){
            result = daysDiff(addDays(), resetTime(last.created.value));
        }
        return result;
    }
}
