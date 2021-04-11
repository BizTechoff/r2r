import { BoolColumn, Context, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Driver } from "../driver/driver";
import { Patient } from "../patient/patient";
import { DrivingStatusTypes } from "./drivingStatusTypes";

@EntityClass  
export class Driving extends IdEntity {

    driverId = new StringColumn({});//DriverColumn
    patientId = new StringColumn({});//PatientColumn
    status = DrivingStatusTypes.WaitingForMatch;

    from_ = new StringColumn({});//AddressColumn
    to_ = new StringColumn({});
    date = new DateTimeColumn({});
    dayPeriod = new NumberColumn({});//DayPeriodColumn DayPeriodTypes.Morning;
    isNeedAlsoReturnDriving = new BoolColumn({});
    isNeedWheelchair = new BoolColumn({});
    isHasEscort = new BoolColumn({});
    escortsCount = new NumberColumn({});

    //dbCursors
    driver: Driver;//DriverColumn
    patient: Patient;//PatientColumn

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

export enum DayPeriodTypes{
    Morning = 1,// מהגבול לביח / הלוך
    Afternoon,// מביח לגבול/ חזור
}
