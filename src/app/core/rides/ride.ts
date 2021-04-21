import { BoolColumn, Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
import { Utils } from "../../shared/utils";
import { DriverIdColumn } from "../drivers/driver";
import { DayOfWeekColumn, DayPeriodColumn } from "../drivers/driverPrefSchedule";
import { LocationIdColumn } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";

@EntityClass
export class Ride extends IdEntity {

    driverId = new DriverIdColumn(this.context, "Driver", "driverId");
    patientId = new PatientIdColumn(this.context, "Patient", "patientId");
    status = new RideStatusColumn();
    importRideNum = new StringColumn();
    
    from = new LocationIdColumn(this.context, "From", 'from_');
    to = new LocationIdColumn(this.context, "To", 'to_');
    date = new DateColumn({
        // valueChange: () => {this.dayOfWeek.value = Utils.getDayOfWeek(this.date.getDayOfWeek())},
         
    });
    dayPeriod = new DayPeriodColumn();
    dayOfWeek = new DayOfWeekColumn({
        // return Utils.getDayOfWeek(this.date.getDayOfWeek());
    });

    isNeedBabyChair = new BoolColumn({ caption: 'Need Baby Chair' });
    isNeedWheelchair = new BoolColumn({ caption: 'Need Wheel Chair' });
    isHasEscort = new BoolColumn({ caption: 'Has Escort' });
    escortsCount = new NumberColumn({});

    constructor(private context: Context) {
        super({
            name: "rides",
            allowApiCRUD: c => c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),

            
        });
    }

    getDayOfWeek(){
        return Utils.getDayOfWeek(this.date.getDayOfWeek());
    }

    copyTo(target: Ride) {
        target.from.value = this.from.value;
        target.to.value = this.to.value;
        target.dayPeriod.value = this.dayPeriod.value;
        target.date.value = this.date.value;
        target.isNeedWheelchair.value = this.isNeedWheelchair.value;
        target.isHasEscort.value = this.isHasEscort.value;
        target.escortsCount.value = this.escortsCount.value;
        target.patientId.value = this.patientId.value;
        target.driverId.value = this.driverId.value;
        target.status = this.status;
    }

}

export class RideStatus {
    static waitingFor2Patient = new RideStatus(2, 'waitingForPatient',);//driver future ride
    static waitingFor1DriverAccept = new RideStatus(1, 'waitingForDriverAccept',);
    static waitingFor3Match = new RideStatus(3, 'waitingForMatch',);
    static waitingFor4Start = new RideStatus(4, 'waitingForStart',);
    static waitingFor5Pickup = new RideStatus(5, 'waitingForPickup',);
    static waitingFor6Arrived = new RideStatus(6, 'waitingForArrived',);
    static succeeded = new RideStatus(10, 'succeeded',);
    static failed = new RideStatus(11, 'failed',);
    static rejected = new RideStatus(12, 'rejected',);
    constructor(public id: number, public caption: string, public color = 'green') { }
}
//חולה ונהג יכולים להיות ריקים
export class RideStatusColumn extends ValueListColumn<RideStatus>{
    constructor() {
        super(RideStatus);
        this.value = RideStatus.waitingFor3Match;
    }
}
 