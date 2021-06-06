import { BoolColumn, ColumnSettings, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
import { DialogService } from "../../common/dialog";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { InputAreaComponent } from "../../common/input-area/input-area.component";
import { MessageType, ServerEventsService } from "../../server/server-events-service";
import { UserId } from "../../users/users";
import { ApplicationSettings } from "../application-settings/applicationSettings";
import { DriverIdColumn } from "../drivers/driver";
import { DriverPrefs } from "../drivers/driverPrefs";
import { LocationIdColumn } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";
import { addHours } from "../usher/usher";
import { RideHistory } from "./rideHistory";

@EntityClass
export class Ride extends IdEntity {

    //driverRemark = new StringColumn({});
    driverId = new DriverIdColumn({ caption: 'Driver' }, this.context);
    patientId = new PatientIdColumn(this.context);
    status = new RideStatusColumn();
    statusDate = new DateTimeColumn();
    importRideNum = new StringColumn();

    date = new DateColumn({});
    fid = new LocationIdColumn({ caption: 'From Location', allowNull: false }, this.context);
    tid = new LocationIdColumn({ caption: 'To Location', allowNull: false }, this.context);

    visitTime = new StringColumn({
        defaultValue: '00:00', inputType: 'time'//, 
        // valueChange: () => {
        //     if (this.visitTime.value) {
        //         if (!(this.isHasPickupTime())) {
        //             let pickup = '00:00';
        //             let hour = this.visitTime.value.split(':');
        //             if (hour.length > 1) {
        //                 pickup = ('' + (parseInt(hour[0]) - 2)).padStart(2, "0") + ":" + hour[1];
        //             }
        //             this.pickupTime.value = pickup;
        //         }
        //     }
        // }
    });
    pickupTime = new StringColumn({ defaultValue: '00:00', inputType: 'time' });
    // dayPeriod = new DayPeriodColumn();
    // dayOfWeek = new DayOfWeekColumn({});
    isHasBabyChair = new BoolColumn({ caption: 'Has Babyseat?' });
    isHasWheelchair = new BoolColumn({ caption: 'Wheelchair?' });
    //isHasExtraEquipment = new BoolColumn({ caption: 'Has Extra Equipment' });
    // isHasEscort = new BoolColumn({ caption: 'Has Escort', defaultValue: false });
    escortsCount = new NumberColumn({});
    backId = new StringColumn({});
    pMobile = new StringColumn({ caption: 'Patient Mobile' });
    dRemark = new StringColumn({ caption: 'Remark For Driver' });
    rRemark = new StringColumn({ caption: 'Remark For Ride' });
    isBackRide = new BoolColumn({ defaultValue: false });
    mApproved = new BoolColumn({ defaultValue: false }); 
    isSplitted = new BoolColumn({ defaultValue: false });
    changed = new DateTimeColumn();
    changedBy = new UserId(this.context);

    constructor(private context: Context, private appSettings: ApplicationSettings, private dialog: DialogService) {
        super({
            name: "rides",
            allowApiCRUD: c => c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),
            saving: async () => {
                if (context.onServer) {
                    if (this.status.wasChanged()) {
                        this.statusDate.value = new Date();
                    }
                    if (this.visitTime.wasChanged()) {
                        this.pickupTime.value = addHours(-2, this.visitTime.value);
                    }
                    this.changed.value = new Date();
                    this.changedBy.value = this.context.user.id;
                }
            },
            saved: async () => {//trigger from db on date OR status changed
                if (context.onServer) {
                    if (this.isNew() || this.date.wasChanged() || this.pickupTime.wasChanged() || this.status.wasChanged()) {
                        let history = await this.context.for(RideHistory).create();
                        history.rid.value = this.id.value;
                        history.date.value = this.date.value;
                        history.pickupTime.value = this.pickupTime.value;
                        history.status.value = this.status.value;
                        await history.save();

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
        return 1 /*patient*/ + this.escortsCount.value;
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
        return this.visitTime && this.visitTime.value && this.visitTime.value.length > 0 && (!(this.visitTime.value === '00:00'));
    }

    isHasPickupTime() {
        return this.pickupTime && this.pickupTime.value && this.pickupTime.value.length > 0 && (!(this.pickupTime.value === '00:00'));
    }

    isExsistPatient(): boolean {
        return this.patientId && this.patientId.value && this.patientId.value.length > 0;
    }

    isExsistBakcup(): boolean {
        return this.backId && this.backId.value && this.backId.value.length > 0;
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

    isWaitingForAccept() {
        return this.status.value === RideStatus.waitingForAccept;
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
        // target.dayOfWeek.value = this.dayOfWeek.value;
        // target.dayPeriod.value = this.dayPeriod.value;
        target.date.value = this.date.value;
        target.isHasBabyChair.value = this.isHasBabyChair.value;
        target.isHasWheelchair.value = this.isHasWheelchair.value;
        //     target.isHasExtraEquipment.value = this.isHasExtraEquipment.value;
        // target.isHasEscort.value = this.isHasEscort.value;
        target.escortsCount.value = this.escortsCount.value;
        target.patientId.value = this.patientId.value;
        if (!(forBackRide)) {
            target.fid.value = this.fid.value;
            target.tid.value = this.tid.value;
            target.pickupTime.value = this.pickupTime.value;
            target.visitTime.value = this.visitTime.value;
            target.driverId.value = this.driverId.value;
            target.backId.value = this.backId.value;
            target.status = this.status;
            target.statusDate.value = this.statusDate.value;
            target.importRideNum.value = this.importRideNum.value;
            target.dRemark.value = this.dRemark.value;
            target.rRemark.value = this.rRemark.value;
            //       target.driverRemark.value = this.driverRemark.value;
        }
    }

    toString() {
        return `${this.date.value} | ${this.fid.value} | ${this.tid.value} | ${this.status.value} | ${this.statusDate.value} | ${this.passengers()}`
    }
}

export class RideStatus {
    static suggestedByUsher = new RideStatus();//
    static suggestedByDriver = new RideStatus();//
    static waitingForPatient = new RideStatus();//
    static waitingForPatientAndDriver = new RideStatus();//
    static waitingForUsherApproove = new RideStatus();//
    static waitingForUsherSelectDriver = new RideStatus();//

    static waitingInHospital = new RideStatus();//ride-status OR patient-status
    static waitingForDriver = new RideStatus();
    static waitingForAccept = new RideStatus();
    static waitingForStart = new RideStatus();
    static waitingForPickup = new RideStatus();
    static waitingForArrived = new RideStatus();
    static waitingForEnd = new RideStatus();
    static succeeded = new RideStatus();
    static failed = new RideStatus();
    static rejected = new RideStatus();
    constructor(public color = 'green') { }
    id: string;

    // status.DriverNotStratedYet,
    //       status.DriverStratedButNotArrived,
    //       status.DriverArrived,

    isEquals(status: string) {
        return status === this.id;
    }

    static isInProgressStatuses = [
        RideStatus.waitingForPickup,
        RideStatus.waitingForArrived
    ];

    static isInCanBackRideStatuses = [
        RideStatus.waitingForArrived,
    ];

    static isInMatcherCanApproveStatuses = [
        RideStatus.waitingForStart,
    ];

    static isInDriverWaitingStatuses = [
        RideStatus.waitingForAccept,
        RideStatus.waitingForDriver,
        RideStatus.waitingForStart,
        RideStatus.waitingForPickup,
        RideStatus.waitingForArrived,
        RideStatus.waitingForEnd,
    ];

    static isNoDriverRelevent = [
        RideStatus.failed,
        RideStatus.rejected,
        RideStatus.succeeded,
        RideStatus.waitingForDriver,
    ];

    static isInDriverAvailableStatuses = [
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


export class RideIdColumn extends StringColumn {
    getName() {
        return this.context.for(Ride).lookup(this).id.value;
    }
    async getValueName() {
        return (await this.context.for(Ride).findId(this.value)).id.value;
    }
    constructor(private context?: Context, options?: ColumnSettings<string>) {
        super({
            dataControlSettings: () => ({
                getValue: () => this.getName(),
                hideDataOnInput: true,
                clickIcon: 'search',
                click: (d) => {
                    this.context.openDialog(DynamicServerSideSearchDialogComponent,
                        x => x.args(Ride, {
                            onClear: () => this.value = '',
                            onSelect: cur => this.value = cur.id.value,
                            searchColumn: cur => cur.id
                        }));
                }
            })
        }, options);
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
                    r.fid,
                    r.tid,
                    r.date,
                    // {
                    //     column: r.dayPeriod,
                    //     valueList: [DayPeriod.morning, DayPeriod.afternoon]
                    // },
                    r.isHasBabyChair,
                    r.isHasWheelchair,
                    //             r.isHasExtraEquipment,
                    r.escortsCount,
                    // r.isHasEscort,
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
                    // {
                    //     column: r.escortsCount,
                    //     visible: () => r.isHasEscort.value,
                    // },
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

// export async function addRide(rid: string, context: Context): Promise<boolean> {
//     let today = new Date();
//     let tomorrow = new Date();
//     tomorrow.setDate(today.getDate() + 1);
//     let tomorrow10am = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10);

//     var ride = context.for(Ride).create();
//     ride.date.value = tomorrow;
//     // ride.visitTime.value = tomorrow10am;
//     // ride.dayOfWeek.value = DriverPrefs.getDayOfWeek(ride.date.getDayOfWeek());
//     // ride.dayPeriod.value = DayPeriod.morning;
//     // ride.patientId.value = p.id.value;
//     // ride.fromLocation.value = p.defaultBorder.value;
//     // ride.toLocation.value = p.defaultHospital.value;
//     var isNeedReturnTrip = new BoolColumn({ caption: "Need Return Ride" });
//     context.openDialog(
//         InputAreaComponent,
//         x => x.args = {
//             title: "Add Ride",// For: " + p.name.value,
//             columnSettings: () => [
//                 ride.fid,
//                 ride.tid,
//                 ride.date, 
//                 // {
//                 //     column: ride.dayPeriod,
//                 //     valueList: [DayPeriod.morning, DayPeriod.afternoon],
//                 // },
//                 {
//                     column: isNeedReturnTrip,
//                     visible: (r) => ride.dayPeriod.value == DayPeriod.morning,
//                 },
//                 {
//                     column: ride.visitTime,
//                     visible: (r) => ride.dayPeriod.value == DayPeriod.morning,
//                     inputType: 'time',
//                 },
//                 ride.isHasBabyChair,
//                 ride.isHasWheelchair,
//                 ride.isHasExtraEquipment,
//                 ride.escortsCount,
//                 // ride.isHasEscort,
//                 // {
//                 //     column: ride.escortsCount,
//                 //     visible: (r) => ride.isHasEscort.value
//                 // },
//             ],
//             ok: async () => {
//                 await ride.save();
//                 // if (isNeedReturnTrip.value && ride.dayPeriod.value == DayPeriod.morning) {
//                 //     var returnRide = context.for(Ride).create();
//                 //     ride.copyTo(returnRide);
//                 //     returnRide.fromLocation.value = ride.toLocation.value;
//                 //     returnRide.toLocation.value = ride.fromLocation.value;
//                 //     returnRide.dayPeriod.value = DayPeriod.afternoon;
//                 //     await returnRide.save();
//                 // }
//                 return true;
//             }
//         },
//     )
//     return false;
// }
