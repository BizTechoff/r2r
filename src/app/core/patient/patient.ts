import { async } from "@angular/core/testing";
import { BoolColumn, Context, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../users/roles";
import { DrivingMatcher } from "../driving/drivingMatcher";


@EntityClass
export class Patient extends IdEntity {

    driverId = new StringColumn({});
    assignChanged = new DateTimeColumn({});
    name = new StringColumn({});
    mobile = new StringColumn({});
    idNumber = new StringColumn({});
    fromAddress = new StringColumn({});//{ caption: "From" });
    toAddress = new StringColumn({});//{ caption: "To" });
    fromHour = new DateTimeColumn({});
    toHour = new DateTimeColumn({});
    isNeedWheelchair = new BoolColumn({});
    isHasEscort = new BoolColumn({});
    escortsCount = new NumberColumn({});
    
    constructor(private context: Context) {
        super({
            name: "patients",
            allowApiCRUD: [Roles.matcher],
            allowApiRead: c => c.isSignedIn(),
            // allowApiDelete:false,
            // saving:async()=>{
            //     this.isNew()
            //     if (context.onServer){
            //     if(this.status.value!=this.status.originalValue){
            //     let u  =await  context.for(Users).findId(this.id);
            //     i.status.value = this.status.value;
            //     await u.save();}
            //     }

            // },
            // deleted:async()=>{}

        });
    }
}
