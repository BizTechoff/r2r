import { BoolColumn, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { DriverIdColumn } from "../../drivers/driver";
import { LocationIdColumn } from "../../locations/location";

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
        caption: 'To',
        validate: () => {
            if (!(this.tid.value)) {
                this.tid.validationError = 'Required';
            }
        }, 
    }, this.context);
    fdate = new DateColumn({
        caption: 'From Date',
        validate: () => {
            if (!(this.fdate.value)) {
                this.fdate.validationError = " Date Required";
            }
            // else if (this.fdate.value < new Date()) {
            //     this.fdate.validationError = " Date Must From Today And Above";
            // }
        },
        valueChange: () => {
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

    constructor(private context: Context) {
        super({
            name: "ridesRegisters",
            allowApiCRUD: [Roles.admin],
            allowApiRead: c => c.isSignedIn(),
        });
    }

}
