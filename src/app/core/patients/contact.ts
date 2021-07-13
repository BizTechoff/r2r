import { Context, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { MobileColumn } from "../../shared/types";
import { Roles } from "../../users/roles";
import { PatientIdColumn } from "./patient";

@EntityClass
export class Contact extends IdEntity {
 
    pid = new PatientIdColumn(this.context);
    name = new StringColumn({});
    mobile = new MobileColumn(this.context);
    idNumber = new StringColumn({});
    relation = new StringColumn({});

    constructor(private context: Context) {
        super({
            name: "contacts",
            allowApiCRUD: [Roles.admin, Roles.usher, Roles.matcher],
            allowApiInsert: c=> c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),
            defaultOrderBy: () => this.name
        });
    }

}
