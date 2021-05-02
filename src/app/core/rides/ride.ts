import { formatDate } from "@angular/common";
import { BoolColumn, ColumnSettings, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
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
        valueChange: () => {
            if (this.hasDate() && this.hasVisitTime()) {
                this.visitTime.value = new Date(
                    this.date.value.getFullYear(),
                    this.date.value.getMonth(),
                    this.date.value.getDate(),
                    this.visitTime.value.getHours(),
                    this.visitTime.value.getMinutes());
            }
        },
        // valueChange: () => {this.dayOfWeek.value = Utils.getDayOfWeek(this.date.getDayOfWeek())},

    });
    visitTime = new DateTimeColumn({});
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

    hasDate() {
        return this.date && this.date.value && this.date.value.getFullYear() > 2000;
    }

    hasVisitTime() {
        return this.visitTime && this.visitTime.value && this.visitTime.value.getHours() > 0;
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
                            if (!(process.env.IMPORT_DATA)) {
                                console.log("appSettings.allowPublishMessages.value = false");
                            }
                        }
                    }
                }
            }


        });
    }

    exsistPatient(): boolean {
        return this.patientId && this.patientId.value && this.patientId.value.length > 0;
    }

    exsistDriver(): boolean {
        return this.driverId && this.driverId.value && this.driverId.value.length > 0;
    }

    getDayOfWeek() {
        return DriverPrefs.getDayOfWeek(this.date.getDayOfWeek());
    }


    isSuggestedByDriver() {
        return this.status.value === RideStatus.suggestedByDriver;
    }

    isSuggestedByUsher() {
        return this.status.value === RideStatus.suggestedByUsher;
    }

    isWaitingForDriverAccept() {
        return this.status.value === RideStatus.waitingForDriverAccept;
    }

    isWaitingForUsherApproove() {
        return this.status.value === RideStatus.waitingForUsherApproove;
    }

    isWaitingForStart() {
        return this.status.value === RideStatus.waitingForStart;
    }

    isWaitingForPickup() {
        return this.status.value === RideStatus.waitingForPickup;
    }

    isWaitingForArrived() {
        return this.status.value === RideStatus.waitingForArrived;
    }


    copyTo(target: Ride) {
        target.from.value = this.from.value;
        target.to.value = this.to.value;
        target.dayOfWeek.value = this.dayOfWeek.value;
        target.dayPeriod.value = this.dayPeriod.value;
        target.date.value = this.date.value;
        target.visitTime.value = this.visitTime.value;
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
    static suggestedByUsher = new RideStatus();
    static suggestedByDriver = new RideStatus();
    static waitingForUsherSelectDriver = new RideStatus();
    static waitingForDriverAccept = new RideStatus();
    static waitingForUsherApproove = new RideStatus();
    static waitingForStart = new RideStatus();
    static waitingForPickup = new RideStatus();
    static waitingForArrived = new RideStatus();
    static waitingForEnd = new RideStatus();
    static succeeded = new RideStatus();
    static failed = new RideStatus();
    static rejected = new RideStatus();
    constructor(public color = 'green') { }
    id;
    // caption;
}

//חולה ונהג יכולים להיות ריקים
export class RideStatusColumn extends ValueListColumn<RideStatus>{
    constructor(options?: ColumnSettings<RideStatus>) {
        super(RideStatus, {
            defaultValue: RideStatus.waitingForDriverAccept,
            ...options
        });
    }
}

