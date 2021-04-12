import { BoolColumn, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { Driver } from "../drivers/driver";
import { DayPeriodColumn } from "../drivers/DriverPrefSchedule";
import { LocationIdColumn } from "../locations/location";
import { Patient } from "../patients/patient";
import { RideStatusTypes } from "./rideStatusTypes";

@EntityClass  
export class Ride extends IdEntity {

    driverId = new StringColumn({});//DriverColumn
    patientId = new StringColumn({});//PatientColumn
    status = RideStatusTypes.WaitingForMatch;

    from = new LocationIdColumn(this.context, "From", 'from_');//LocationColumn
    to = new LocationIdColumn(this.context, "To", 'to_');
    date = new DateColumn({});
    dayPeriod = new DayPeriodColumn();//DayPeriodColumn DayPeriodTypes.Morning;
    
    isNeedWheelchair = new BoolColumn({caption:'Need Wheel Chair'});
    isHasEscort = new BoolColumn({caption:'Has Escort'});
    escortsCount = new NumberColumn({});

    //dbCursors
    driver: Driver;//DriverColumn
    patient: Patient;//PatientColumn

    constructor(private context: Context) {
        super({
            name: "rides",
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

    copyTo(target: Ride){
        target.from.value = this.from.value;
        target.to.value = this.to.value;
        target.dayPeriod.value =  this.dayPeriod.value;
        target.date.value = this.date.value;
        target.isNeedWheelchair.value = this.isNeedWheelchair.value;
        target.isHasEscort.value = this.isHasEscort.value;
        target.escortsCount.value = this.escortsCount.value;
        target.patientId.value = this.patientId.value;
        target.driverId.value  = this.driverId.value;
        target.status = this.status;
    }

}

export enum DayPeriodTypes{
    Morning = 1,// מהגבול לביח / הלוך
    Afternoon,// מביח לגבול/ חזור
}
