import { Context, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { Roles } from "../../users/roles";

@EntityClass
export class Driver extends IdEntity {

    userId = new StringColumn({});// The user-table will be the driver.
    name = new StringColumn({});
    mobile = new StringColumn({});

    constructor(private context: Context) {
        super({
            name: "drivers",
            allowApiCRUD: c => c.isSignedIn(),// [Roles.driver, Roles.admin],
            allowApiRead: c => c.isSignedIn(),
            
            // allowApiDelete:false,
            // saving:async()=>{
            //     if (context.onServer)
            //     {if(this.isNew())
            //     {if(this.status.value!=this.status.originalValue){
            //     let u  =await  context.for(Users).findId(this.id);
            //     i.status.value = this.status.value;
            //     await u.save();}
            //     }
            //     }

            // },
            // deleting:async()=>{}
        })
    }
}
