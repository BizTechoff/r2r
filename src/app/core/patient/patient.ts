import { async } from "@angular/core/testing";
import { BoolColumn, Context, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../users/roles";
import { DrivingMatcher } from "../driving/drivingMatcher";


@EntityClass
export class Patient extends IdEntity {

    name = new StringColumn({});
    mobile = new StringColumn({});
    idNumber = new StringColumn({});
    defaultBorderCrossing = new StringColumn({});
    defaultHospital = new StringColumn({});
    
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
