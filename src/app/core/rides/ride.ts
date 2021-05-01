import { BoolColumn, ColumnSettings, Context, DateColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
import { MessageType, ServerEventsService } from "../../server/server-events-service";
import { ApplicationSettings } from "../application-settings/applicationSettings";
import { DriverIdColumn } from "../drivers/driver";
import { DayOfWeekColumn, DayPeriodColumn, DriverPrefs } from "../drivers/driverPrefs";
import { LocationIdColumn } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";

@EntityClass
export class Ride extends IdEntity {

    driverId = new DriverIdColumn(this.context, "Driver", "driverId");
    patientId = new PatientIdColumn(this.context, "Patient", "patientId");
    status = new RideStatusColumn();
    statusDate = new DateColumn();
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
    isHasBabyChair = new BoolColumn({ caption: 'Has Baby Chair' });
    isHasWheelchair = new BoolColumn({ caption: 'Has Wheel Chair' });
    isHasExtraEquipment = new BoolColumn({ caption: 'Has Extra Equipment' });

    isHasEscort = new BoolColumn({ caption: 'Has Escort', defaultValue: false });
    escortsCount = new NumberColumn({});

    passengers() {
        return 1 /*patient*/ + (this.isHasEscort.value ? this.escortsCount.value : 0);
    }

    constructor(private context: Context, private appSettings: ApplicationSettings) {
        super({
            name: "rides",
            allowApiCRUD: c => c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),
            saved: async () => {//trigger from db on status changed
                if (context.onServer) {
                    if (this.status.wasChanged()) {
                        // if (appSettings.allowPublishMessages.value) {
                        if (false) {
                            ServerEventsService.OnServerSendMessageToChannel(
                                this.driverId.value,
                                {
                                    type: MessageType.usherSendStatusToDriver,
                                    status: this.status.value,
                                    text: 'The message text',
                                });
                        }
                        else {
                            console.log("appSettings.allowPublishMessages.value = false");
                        }
                    }
                }
            }


        });
    }

    getDayOfWeek() {
        return DriverPrefs.getDayOfWeek(this.date.getDayOfWeek());
    }


    isWaitingForDriverAccept() {
        return this.status.value === RideStatus.waitingFor10DriverAccept;
    }

    isWaitingForUsherApproove() {
        return this.status.value === RideStatus.waitingFor20UsherApproove;
    }

    isWaitingForStart() {
        return this.status.value === RideStatus.waitingFor30Start;
    }

    isWaitingForPickup() {
        return this.status.value === RideStatus.waitingFor40Pickup;
    }

    isWaitingForArrived() {
        return this.status.value === RideStatus.waitingFor50Arrived;
    }


    copyTo(target: Ride) {
        target.from.value = this.from.value;
        target.to.value = this.to.value;
        target.dayOfWeek.value = this.dayOfWeek.value;
        target.dayPeriod.value = this.dayPeriod.value;
        target.date.value = this.date.value;
        target.isHasBabyChair.value = this.isHasBabyChair.value;
        target.isHasWheelchair.value = this.isHasWheelchair.value;
        target.isHasExtraEquipment.value = this.isHasExtraEquipment.value;
        target.isHasEscort.value = this.isHasEscort.value;
        target.escortsCount.value = this.escortsCount.value;
        target.patientId.value = this.patientId.value;
        target.driverId.value = this.driverId.value;
        target.status = this.status;
    }

    toString() {
        return `${this.date.value} | ${this.from.value} | ${this.to.value} | ${this.status.value} | ${this.statusDate.value} | ${this.passengers()}`
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
    // static isWaitingForUsherApproove(){return this.waitingFor20UsherApproove;}
}

//חולה ונהג יכולים להיות ריקים
export class RideStatusColumn extends ValueListColumn<RideStatus>{
    constructor(options?: ColumnSettings<RideStatus>) {
        super(RideStatus, {
            defaultValue: RideStatus.waitingFor10DriverAccept,
            ...options
        });
    }
}

