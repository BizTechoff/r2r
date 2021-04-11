import { Context, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Driver } from "../driver/driver";
import { Patient } from "../patient/patient";
import { DrivingStatusTypes } from "./drivingStatusTypes";

@EntityClass  
export class Driving extends IdEntity {

    driverId = new StringColumn({});
    patientId = new StringColumn({});
    status = DrivingStatusTypes.WaitingForMatch;

    //dbCursors
    driver: Driver;
    patient: Patient;

    constructor(private context: Context) {
        super({
            name: "drivings",
            allowApiCRUD: c => c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),

            
        });
    }

    async fulfill() {
        if (this.driverId && this.driverId.value && this.driverId.value.length > 0) {
            this.driver = await this.context.for(Driver).findId(
                this.driverId.value);
        }
        if (this.patientId && this.patientId.value && this.patientId.value.length > 0) {
            this.patient = await this.context.for(Patient).findId(
                this.patientId.value);
        }
    }

}