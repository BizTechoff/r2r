import { BoolColumn, ColumnSettings, Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
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

    assignDate = new DateColumn({});
    isNeedBabyChair = new BoolColumn({ caption: 'Need Baby Chair' });
    isNeedWheelchair = new BoolColumn({ caption: 'Need Wheel Chair' });
    isHasExtraEquipment = new BoolColumn({ caption: 'Has Extra Equipment' });
    
    isHasEscort = new BoolColumn({ caption: 'Has Escort', defaultValue: false });
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
    

    isWaitingForDriverAccept(){
        return this.status.value === RideStatus.waitingFor10DriverAccept;
    }

    isWaitingForUsherApproove(){
        return this.status.value === RideStatus.waitingFor20UsherApproove;
    }

    isWaitingForStart(){
        return this.status.value === RideStatus.waitingFor30Start;
    }

    isWaitingForPickup(){
        return this.status.value === RideStatus.waitingFor40Pickup;
    }

    isWaitingForArrived(){
        return this.status.value === RideStatus.waitingFor50Arrived;
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
    static waitingFor10DriverAccept = new RideStatus(10, 'waitingForDriverAccept',);
    //static waitingFor12Patient = new RideStatus(2, 'waitingForPatient',);//driver future ride
    //static waitingFor18Match = new RideStatus(3, 'waitingForMatch',);
    static waitingFor20UsherApproove = new RideStatus(20, 'waitingForUsherApproove',);
    static waitingFor30Start = new RideStatus(30, 'waitingForStart',);
    static waitingFor40Pickup = new RideStatus(40, 'waitingForPickup',);
    static waitingFor50Arrived = new RideStatus(50, 'waitingForArrived',);
    static waitingFor60End = new RideStatus(60, 'waitingForEnd',);
    static succeeded = new RideStatus(100, 'succeeded',);
    static failed = new RideStatus(101, 'failed',);
    static rejected = new RideStatus(102, 'rejected',);
    constructor(public id: number, public caption: string, public color = 'green') { }
}

//חולה ונהג יכולים להיות ריקים
export class RideStatusColumn extends ValueListColumn<RideStatus>{
    constructor(options?:ColumnSettings<RideStatus>) {
        super(RideStatus, {
            defaultValue:  RideStatus.waitingFor10DriverAccept,
            ...options
        });
    }
}
 