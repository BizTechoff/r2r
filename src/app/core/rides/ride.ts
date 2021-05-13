import { formatDate } from "@angular/common";
import { BoolColumn, ColumnSettings, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
import { InputAreaComponent } from "../../common/input-area/input-area.component";
import { MessageType, ServerEventsService } from "../../server/server-events-service";
import { ApplicationSettings } from "../application-settings/applicationSettings";
import { DriverIdColumn } from "../drivers/driver";
import { DayOfWeekColumn, DayPeriod, DayPeriodColumn, DriverPrefs } from "../drivers/driverPrefs";
import { LocationIdColumn } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";

@EntityClass
export class Ride extends IdEntity {

    driverRemark = new StringColumn({});
    driverId = new DriverIdColumn({}, this.context);
    patientId = new PatientIdColumn(this.context);
    status = new RideStatusColumn();
    statusDate = new DateColumn();
    importRideNum = new StringColumn();

    fromLocation = new LocationIdColumn({}, this.context);
    toLocation = new LocationIdColumn({}, this.context);
    date = new DateColumn({
        valueChange: () => {
            if (this.isHasDate() && this.isHasVisitTime()) {
                this.visitTime.value = new Date(
                    this.date.value.getFullYear(),
                    this.date.value.getMonth(),
                    this.date.value.getDate(),
                    this.visitTime.value.getHours(),
                    this.visitTime.value.getMinutes());
            }
        },
    });
    visitTime = new DateTimeColumn({});
    dayPeriod = new DayPeriodColumn();
    dayOfWeek = new DayOfWeekColumn({});
    isHasBabyChair = new BoolColumn({ caption: 'Has Baby Chair' });
    isHasWheelchair = new BoolColumn({ caption: 'Has Wheel Chair' });
    isHasExtraEquipment = new BoolColumn({ caption: 'Has Extra Equipment' });
    isHasEscort = new BoolColumn({ caption: 'Has Escort', defaultValue: false });
    escortsCount = new NumberColumn({});
    backId = new StringColumn({});
    pMobile = new StringColumn({});
    dRemark = new StringColumn({});
    rRemark = new StringColumn({});

    constructor(private context: Context, private appSettings: ApplicationSettings) {
        super({
            name: "rides",
            allowApiCRUD: c => c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),
            saving: async () => {if (context.onServer) {
                if (this.status.wasChanged()){
                    this.statusDate.value = new Date();
                }
            }},
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
    hadBackId() {
        return this.backId && this.backId.value && this.backId.value.length > 0;
    }

    passengers() {
        return 1 /*patient*/ + (this.isHasEscort.value ? this.escortsCount.value : 0);
    }

    isHasDate() {
        return this.date && this.date.value && this.date.value.getFullYear() > 1900;
    }

    isHasDriver() {
        return this.driverId && this.driverId.value && this.driverId.value.length > 0;
    }

    isHasPatient() {
        return this.patientId && this.patientId.value && this.patientId.value.length > 0;
    }

    isHasVisitTime() {
        return this.visitTime && this.visitTime.value && this.visitTime.value.getHours() > 0;
    }

    isExsistPatient(): boolean {
        return this.patientId && this.patientId.value && this.patientId.value.length > 0;
    }

    isExsistDriver(): boolean {
        return this.driverId && this.driverId.value && this.driverId.value.length > 0;
    }

    getDayOfWeek() {
        return DriverPrefs.getDayOfWeek(this.date.getDayOfWeek());
    }

    isDriverCurrentlyDriving() {
        let inRiding: RideStatus[] = [
            RideStatus.waitingForPickup,
            RideStatus.waitingForArrived,];
        return this.isExsistDriver() && inRiding.includes(this.status.value);
    }

    isCanRemovewDriver() {
        let waitings: RideStatus[] = [
            RideStatus.suggestedByDriver,
            RideStatus.suggestedByUsher,
            RideStatus.waitingForPatient,
            RideStatus.waitingForDriver,
            RideStatus.waitingForPatientAndDriver];
        return this.isExsistDriver() && waitings.includes(this.status.value);
    }

    isCanRemovewPatient() {
        let waitings: RideStatus[] = [
            RideStatus.suggestedByDriver,
            RideStatus.suggestedByUsher,
            RideStatus.waitingForPatient,
            RideStatus.waitingForDriver,
            RideStatus.waitingForPatientAndDriver];
        return waitings.includes(this.status.value);
    }


    isSuggestedByDriver() {
        return this.status.value === RideStatus.suggestedByDriver;
    }

    isSuggestedByUsher() {
        return this.status.value === RideStatus.suggestedByUsher;
    }

    isWaitingForDriverAccept() {
        return this.status.value === RideStatus.waitingForDriver;
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

    isEnd() {
        return this.status.value === RideStatus.succeeded;
    }


    copyTo(target: Ride, forBackRide: boolean = false) {
        target.dayOfWeek.value = this.dayOfWeek.value;
        target.dayPeriod.value = this.dayPeriod.value;
        target.date.value = this.date.value;
        target.isHasBabyChair.value = this.isHasBabyChair.value;
        target.isHasWheelchair.value = this.isHasWheelchair.value;
        target.isHasExtraEquipment.value = this.isHasExtraEquipment.value;
        target.isHasEscort.value = this.isHasEscort.value;
        target.escortsCount.value = this.escortsCount.value;
        target.patientId.value = this.patientId.value;
        if (!(forBackRide)) {
            target.fromLocation.value = this.fromLocation.value;
            target.toLocation.value = this.toLocation.value;
            target.visitTime.value = this.visitTime.value;
            target.driverId.value = this.driverId.value;
            target.backId.value = this.backId.value;
            target.status = this.status;
            target.statusDate.value = this.statusDate.value;
            target.importRideNum.value = this.importRideNum.value;
            target.driverRemark.value = this.driverRemark.value;
        }
    }

    toString() {
        return `${this.date.value} | ${this.fromLocation.value} | ${this.toLocation.value} | ${this.status.value} | ${this.statusDate.value} | ${this.passengers()}`
    }
}

export class RideStatus {
    static suggestedByUsher = new RideStatus();
    static suggestedByDriver = new RideStatus();
    static waitingForDriver = new RideStatus();
    static waitingForPatient = new RideStatus();
    static waitingForPatientAndDriver = new RideStatus();
    static waitingForUsherApproove = new RideStatus();
    static waitingForStart = new RideStatus();
    static waitingForPickup = new RideStatus();
    static waitingForArrived = new RideStatus();
    static waitingForEnd = new RideStatus();
    static succeeded = new RideStatus();
    static failed = new RideStatus();
    static rejected = new RideStatus();
    static waitingForUsherSelectDriver = new RideStatus();
    constructor(public color = 'green') { }
    id;

    isInProgress(): boolean {
        return this == RideStatus.waitingForPickup
            ||
            this == RideStatus.waitingForArrived;
    }

    static isCanBackRide = [
        RideStatus.waitingForArrived,
    ];

    static driverWaitingStatuses = [
        RideStatus.waitingForDriver,
        RideStatus.waitingForStart,
        RideStatus.waitingForPickup,
        RideStatus.waitingForArrived,
        RideStatus.waitingForEnd,
    ];

    static driverFinishedStatuses = [
        RideStatus.failed,
        RideStatus.rejected,
        RideStatus.succeeded,
        RideStatus.waitingForDriver,
    ];

    static driverAvailable = [
        RideStatus.waitingForStart,
        RideStatus.waitingForUsherApproove,
    ];
}

//חולה ונהג יכולים להיות ריקים
export class RideStatusColumn extends ValueListColumn<RideStatus>{
    constructor(options?: ColumnSettings<RideStatus>) {
        super(RideStatus, {
            defaultValue: RideStatus.waitingForDriver,
            ...options
        });
    }
}



export async function openRide(rid: string, context: Context): Promise<boolean> {

    //let result:UsherRideRow = {};
    let r = await context.for(Ride).findId(rid);
    if (r) {
        context.openDialog(
            InputAreaComponent,
            x => x.args = {
                title: `Edit Ride:`,// ${r.name.value}`,
                columnSettings: () => [
                    r.fromLocation,
                    r.toLocation,
                    r.date, {
                        column: r.dayPeriod,
                        valueList: [DayPeriod.morning, DayPeriod.afternoon]
                    },
                    r.isHasBabyChair,
                    r.isHasWheelchair,
                    r.isHasExtraEquipment,
                    r.isHasEscort,
                    // {
                    //   column: ride.isHasEscort,
                    //   allowClick: () => {return true;},
                    //   click: () => {// not trigger
                    //     console.log("clickclik");
                    //     if (ride.isHasEscort.value) {
                    //       ride.escortsCount.value = Math.max(1, ride.escortsCount.value);
                    //     }
                    //   },
                    // },
                    {
                        column: r.escortsCount,
                        visible: () => r.isHasEscort.value,
                    },
                ],
                ok: async () => {
                    //PromiseThrottle
                    // ride.driverId.value = undefined;
                    await r.save();
                    return true;
                }
            },
        );
    }
    return false;
}

export async function addRide(rid: string, context: Context): Promise<boolean> {
    let today = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    let tomorrow10am = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10);

    var ride = context.for(Ride).create();
    ride.date.value = tomorrow;
    ride.visitTime.value = tomorrow10am;
    ride.dayOfWeek.value = DriverPrefs.getDayOfWeek(ride.date.getDayOfWeek());
    ride.dayPeriod.value = DayPeriod.morning;
    // ride.patientId.value = p.id.value;
    // ride.fromLocation.value = p.defaultBorder.value;
    // ride.toLocation.value = p.defaultHospital.value;
    var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
    context.openDialog(
        InputAreaComponent,
        x => x.args = {
            title: "Add Ride",// For: " + p.name.value,
            columnSettings: () => [
                ride.fromLocation,
                ride.toLocation,
                ride.date, {
                    column: ride.dayPeriod,
                    valueList: [DayPeriod.morning, DayPeriod.afternoon],
                },
                {
                    column: isNeedReturnTrip,
                    visible: (r) => ride.dayPeriod.value == DayPeriod.morning,
                },
                {
                    column: ride.visitTime,
                    visible: (r) => ride.dayPeriod.value == DayPeriod.morning,
                    displayValue: ride.isHasVisitTime() ? formatDate(ride.visitTime.value, "HH:mm", 'en-US') : "",
                },
                ride.isHasBabyChair,
                ride.isHasWheelchair,
                ride.isHasExtraEquipment,
                ride.isHasEscort,
                {
                    column: ride.escortsCount,
                    visible: (r) => ride.isHasEscort.value
                },
            ],
            ok: async () => {
                await ride.save();
                // if (isNeedReturnTrip.value && ride.dayPeriod.value == DayPeriod.morning) {
                //     var returnRide = context.for(Ride).create();
                //     ride.copyTo(returnRide);
                //     returnRide.fromLocation.value = ride.toLocation.value;
                //     returnRide.toLocation.value = ride.fromLocation.value;
                //     returnRide.dayPeriod.value = DayPeriod.afternoon;
                //     await returnRide.save();
                // }
                return true;
            }
        },
    )
    return false;
}
