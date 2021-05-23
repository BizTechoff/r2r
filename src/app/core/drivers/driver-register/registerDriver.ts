import { Context, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { DriverIdColumn } from "../driver";

@EntityClass
export class RegisterDriver extends IdEntity {

    rId = new StringColumn({});
    rgId = new StringColumn({});
    dId = new DriverIdColumn({});
    fromHour = new DateTimeColumn({ caption: 'Avaliable From Hour' });
    toHour = new DateTimeColumn({ caption: 'Avaliable Till Hour' });
    seats = new NumberColumn({
        caption: 'Free Seats',
        validate: () => {
            if (!(this.seats.value > 0)) {
                this.validationError = "Free Seats: at least 1";
            }
        },
    }); 
    created = new DateTimeColumn({});
    modified = new DateTimeColumn({});

    constructor(private context: Context) {
        super({
            name: "driversRegisters",
            allowApiCRUD: [Roles.usher, Roles.admin, Roles.driver],// todo: Manager only
            allowApiRead: c => c.isSignedIn(),
            saving: async () => {
                if(context.onServer){
                    if(this.isNew()){
                        this.created.value = new Date();
                    }
                    else{
                        this.modified.value = new Date();
                    }
                }
            },
        });
    };
    
}
