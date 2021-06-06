import { Context, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { PatientIdColumn } from "../patient";

@EntityClass
export class Contact extends IdEntity {
 
    patientId = new PatientIdColumn(this.context);
    name = new StringColumn({});
    mobile = new StringColumn({});
    idNumber = new StringColumn({});

 
    constructor(private context: Context) {
        super({
            name: "contacts",
            allowApiCRUD:[Roles.admin, Roles.usher, Roles.matcher],
            allowApiRead: c => c.isSignedIn(),
        });
    }

}
