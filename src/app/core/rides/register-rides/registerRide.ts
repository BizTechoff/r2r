import { BoolColumn, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Roles } from "../../../users/roles";
import { DriverIdColumn } from "../../drivers/driver";
import { LocationIdColumn } from "../../locations/location";

@EntityClass
export class RegisterRide extends IdEntity {

    fid = new LocationIdColumn({
        caption: 'From Location',
        validate: async () => {
            if (!(this.fid.value)) {
                this.fid.validationError = 'Required';
            }
        },
        // valueChange: async () => {
        //     let from = await this.context.for(Location).findId(this.fid.value);
        //     if (from) {
        //         if (from.type.value == LocationType.hospital) {
        //             this.tid.setType([LocationType.border]);
        //         }
        //     }
        // },
    }, this.context);
    tid = new LocationIdColumn({
        // allowNull: true,
        // defaultValue: '',
        caption: 'To Location',
        validate: async () => {
            if (!(this.tid.value)) {
                this.tid.validationError = 'Required';
            }
            // if (!(this.tid.value)) {
            //     if (this.fid.value) {
            //         let from = await this.context.for(Location).findId(this.fid.value);
            //         if (from) {
            //             if (from.type.value == LocationType.hospital) {
            //                 // Or from-border Or to-border.
            //                 this.tid.validationError = ' Required Border';
            //             }
            //         }
            //     }
            // }
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
            // else if (this.fdate.wasChanged() && this.fdate.value < todayMidnight) {
            //     this.fdate.validationError = " Must Be Today And Above";
            // }
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
    did = new DriverIdColumn({ caption: 'Approved Driver' }, this.context);
    didDate = new DateTimeColumn({});
    dCount = new NumberColumn({ caption: 'RegisteredDrivers', defaultValue: 0 });
    remark = new StringColumn({});

    constructor(private context: Context) {
        super({
            name: "ridesRegisters",
            allowApiCRUD: [Roles.admin],
            allowApiUpdate: Roles.driver,
            allowApiRead: c => c.isSignedIn(),
        });
    }

    isOneOdDayWeekSelected(): boolean {
        return this.sunday.value || this.monday.value || this.tuesday.value || this.wednesday.value || this.thursday.value || this.friday.value || this.saturday.value;
    }

}
