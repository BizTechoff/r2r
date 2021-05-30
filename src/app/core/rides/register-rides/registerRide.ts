import { BoolColumn, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { DriverIdColumn } from "../../drivers/driver";
import { Location, LocationIdColumn, LocationType } from "../../locations/location";

@EntityClass
export class RegisterRide extends IdEntity {
    
    fid = new LocationIdColumn({
        caption: 'From',
        validate: () => {
            if (!(this.fid.value)) {
                this.fid.validationError = 'Required';
            }
        },
    }, this.context);
    tid = new LocationIdColumn({
        // allowNull: true,
        // defaultValue: '',
        caption: 'To',
        validate: async () => {
            if (!(this.tid.value)) {
                if (this.fid.value) {
                    let from = await this.context.for(Location).findId(this.fid.value);
                    if (from) {
                        if (from.type.value == LocationType.hospital) {
                            // Or from-border Or to-border.
                            this.tid.validationError = ' Required Border';
                        }
                    }
                }
            }
        }
    }, this.context);
    fdate = new DateColumn({
        caption: 'From Date',
        validate: () => {
            let now = new Date();// server date
        let todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (!(this.fdate.value)) {
                this.fdate.validationError = " Date Required";
            }
            else if (this.fdate.value < todayMidnight) {
                this.fdate.validationError = " Must Be Today And Above";
            }
        },
        valueChange: () => {
            // if (this.fdate.value < new Date()) {
            //     this.fdate.value = new Date();
            // }
            if (this.tdate.value <= this.fdate.value) {
                this.tdate.value = this.fdate.value;
            }
        }
    });
    tdate = new DateColumn({
        caption: 'To Date',
        validate: () => {
            if (!(this.tdate.value)) {
                this.tdate.validationError = " Date Required";
            }
            else if (this.tdate.value < this.fdate.value) {
                this.tdate.value = this.fdate.value;
            }
        }
    });
    visitTime = new StringColumn({ inputType: 'time' });
    sunday = new BoolColumn({ caption: 'sun', defaultValue: false });
    monday = new BoolColumn({ caption: 'mon', defaultValue: false });
    tuesday = new BoolColumn({ caption: 'tue', defaultValue: false });
    wednesday = new BoolColumn({ caption: 'wed', defaultValue: false });
    thursday = new BoolColumn({ caption: 'thu', defaultValue: false });
    friday = new BoolColumn({ caption: 'fri', defaultValue: false });
    saturday = new BoolColumn({ caption: 'sat', defaultValue: false });
    // passengers = new NumberColumn({
    //     validate: () => {
    //         if (this.passengers.value == 0) {
    //             this.validationError = " Passengers Required";
    //         }
    //     }
    // });
    did?= new DriverIdColumn({ caption: 'Approved Driver' }, this.context);
    didDate?= new DateTimeColumn({});
    dCount = new NumberColumn({ caption: 'RegisteredDrivers', defaultValue: 0 });
    remark = new StringColumn({});

    constructor(private context: Context) {
        super({
            name: "ridesRegisters",
            allowApiCRUD: [Roles.admin],
            allowApiRead: c => c.isSignedIn(),
        });
    }

}
