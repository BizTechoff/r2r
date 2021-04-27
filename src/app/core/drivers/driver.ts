import { Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { Utils } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { LocationIdColumn } from "../locations/location";

@EntityClass
export class Driver extends IdEntity {

    userId = new StringColumn({});// The user-table will be the driver.
    name = new StringColumn({
        validate: () => {
            if (!this.name.value)
                this.name.validationError = " Is Too Short";
        },
    });
    hebName = new StringColumn({});
    mobile = new StringColumn({
        dataControlSettings: () => ({
            // getValue: (r => Utils.fixMobile(r.mobile.value)),
        }),
        inputType: "tel",

        validate: () => {
            if (!this.mobile.value) {
                // this.mobile.value = "0"
                // this.mobile.validationError = " Is Too Short";
            }
            else if (!Utils.isValidMobile(this.mobile.value)) {
                this.mobile.validationError = " Not Valid";
            }
            else {
                this.mobile.value = Utils.fixMobile(this.mobile.value);
            }
        },
    });
    home? = new LocationIdColumn(this.context, "Home", "home", true);
    email = new StringColumn({});
    seats = new NumberColumn({});
    idNumber = new StringColumn({});
    birthDate = new DateColumn({});
    city = new StringColumn({});
    address = new StringColumn({});

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


export class DriverIdColumn extends StringColumn {
    getName() {
        return this.context.for(Driver).lookup(this).name.value;
    }
    async getValueName() {
        return (await this.context.for(Driver).findId(this.value)).name.value;
    }
    constructor(private context: Context, caption: string, dbName: string) {
        super({
            caption: caption,
            dbName: dbName,
            dataControlSettings: () => ({
                getValue: () => this.getName(),
                hideDataOnInput: true,
                clickIcon: 'search',
                click: (d) => {
                    this.context.openDialog(DynamicServerSideSearchDialogComponent,
                        x => x.args(Driver, {
                            onSelect: l => this.value = l.id.value,
                            searchColumn: l => l.name
                        }));
                }
            })
        });
    }
}
