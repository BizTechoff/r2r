import { async } from "@angular/core/testing";
import { BoolColumn, Context, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../users/roles";
import { LocationIdColumn } from "../locations/location";
import { RideMatcher } from "../rides/rideMatches";


@EntityClass
export class Patient extends IdEntity {

    name = new StringColumn({});
    mobile = new StringColumn({});
    idNumber = new StringColumn({});
    defaultBorderCrossing = new LocationIdColumn(this.context, "Default Border Crossing", "defaultBorderCrossing");
    defaultHospital = new LocationIdColumn(this.context, "Default Hospital", "defaultHospital");
    
    constructor(private context: Context) {
        super({
            name: "patients",
            allowApiCRUD: c => c.isSignedIn(), //[Roles.matcher],
            allowApiRead: c => c.isSignedIn(),
        });
    }
}

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
