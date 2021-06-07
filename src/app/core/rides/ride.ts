import { formatDate } from "@angular/common";
import { BoolColumn, ColumnSettings, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
import { DialogService } from "../../common/dialog";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { MessageType, ServerEventsService } from "../../server/server-events-service";
import { addDays, addHours, TODAY } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { UserId } from "../../users/users";
import { DriverIdColumn } from "../drivers/driver";
import { LocationIdColumn } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";
import { RideHistory } from "./rideHistory";

@EntityClass
export class Ride extends IdEntity {

    fid = new LocationIdColumn({ caption: 'From Location', allowNull: false }, this.context);
    tid = new LocationIdColumn({ caption: 'To Location', allowNull: false }, this.context);
    immediate = new BoolColumn({
        defaultValue: false, valueChange: () => {
            if (this.immediate.value) {
                let now = new Date();
                this.date.value = now;
                this.visitTime.value = formatDate(now, 'HH:mm', 'en-US');
            }
        }
    });
    date = new DateColumn({});
    visitTime = new StringColumn({ defaultValue: '00:00', inputType: 'time' });
    pickupTime = new StringColumn({ defaultValue: '00:00', inputType: 'time' });
    status = new RideStatusColumn();
    statusDate = new DateTimeColumn();

    isHasBabyChair = new BoolColumn({ caption: 'Has Babyseat?', defaultValue: false });
    isHasWheelchair = new BoolColumn({ caption: 'Wheelchair?', defaultValue: false });
    escortsCount = new NumberColumn({});


    driverId = new DriverIdColumn({ caption: 'Driver' }, this.context);
    patientId = new PatientIdColumn(this.context);
    pMobile = new StringColumn({ caption: 'Patient Mobile' });
    importRideNum = new StringColumn();

    backId = new StringColumn({});
    isBackRide = new BoolColumn({ defaultValue: false });
    mApproved = new BoolColumn({ defaultValue: false });
    isSplitted = new BoolColumn({ defaultValue: false });
    dRemark = new StringColumn({ caption: 'Remark For Driver' });
    rRemark = new StringColumn({ caption: 'Remark For Ride' });
    changed = new DateTimeColumn();
    changedBy = new UserId(this.context);

    constructor(private context: Context, private dialog: DialogService) {
        super({
            name: "rides",
            allowApiCRUD: [Roles.admin, Roles.usher, Roles.matcher],
            allowApiRead: c => c.isSignedIn(),
            saving: async () => {
                if (context.onServer) {
                    if (this.status.wasChanged()) {
                        this.statusDate.value = addDays(TODAY);
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
                        let history = this.context.for(RideHistory).create();
                        history.fid.value = this.fid.value;
                        history.tid.value = this.tid.value;
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
    static stayInHospital = new RideStatus();
    static goneByHimself = new RideStatus();
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