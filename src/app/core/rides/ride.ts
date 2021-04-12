import { BoolColumn, Context, DateColumn, EntityClass, IdEntity, NumberColumn, ValueListColumn } from "@remult/core";
import { DriverIdColumn } from "../drivers/driver";
import { DayPeriodColumn } from "../drivers/driverPrefSchedule";
import { LocationIdColumn } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";

@EntityClass
export class Ride extends IdEntity {

    driverId = new DriverIdColumn(this.context, "Driver", "driverId");
    patientId = new PatientIdColumn(this.context, "Patient", "patientId");
    status = new RideStatusColumn();

    from = new LocationIdColumn(this.context, "From", 'from_');
    to = new LocationIdColumn(this.context, "To", 'to_');
    date = new DateColumn({});
    dayPeriod = new DayPeriodColumn();

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
    static waitingForMatch = new RideStatus(1, 'waitingForMatch',);
    static waitingForStart = new RideStatus(2, 'waitingForStart',);
    static waitingForPickup = new RideStatus(3, 'waitingForPickup',);
    static waitingForArrived = new RideStatus(4, 'waitingForArrived',);
    static succeeded = new RideStatus(10, 'succeeded',);
    static failed = new RideStatus(11, 'failed',);
    static rejected = new RideStatus(12, 'rejected',);
    constructor(public id: number, public caption: string, public color = 'green') { }
}

export class RideStatusColumn extends ValueListColumn<RideStatus>{
    constructor() {
        super(RideStatus);
    }
}
