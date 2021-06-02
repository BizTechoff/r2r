import { Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { DriverIdColumn } from "../driver";

@EntityClass
export class RegisterDriver extends IdEntity {
 
    date = new DateColumn();
    rrid = new StringColumn({});
    rid = new StringColumn({});
    did = new DriverIdColumn({});
    fh = new StringColumn({ caption: 'Avaliable From Hour' });
    th = new StringColumn({ caption: 'Avaliable Till Hour' });
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

    isHasFromHour() {
        return this.fh && this.fh.value && this.fh.value.length > 0 && (!(this.fh.value === '00:00' || this.fh.value === '--:--'));
    }

    isHasToHour() {
        return this.th && this.th.value && this.th.value.length > 0 && (!(this.th.value === '00:00'));
    }
    
}
