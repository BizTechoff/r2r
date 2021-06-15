import { formatDate } from "@angular/common";
import { BoolColumn, ColumnSettings, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
import { DialogService } from "../../common/dialog";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { MaxPickupHospital, TimeColumn, TODAY } from "../../shared/types";
import { addDays, addHours } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { UserId } from "../../users/users";
import { DriverIdColumn } from "../drivers/driver";
import { LocationIdColumn, LocationType } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";
import { Location } from "./../locations/location";
import { RideActivity } from "./rideActivity";

@EntityClass
export class Ride extends IdEntity {

    fid = new LocationIdColumn({ caption: 'From Location', allowNull: false }, this.context);
    tid = new LocationIdColumn({ caption: 'To Location', allowNull: false }, this.context);
    immediate = new BoolColumn({
        caption: 'As Soon As Possible',
        defaultValue: false, valueChange: () => {
            if (this.immediate.value) {
                this.date.value = addDays(TODAY);
                this.visitTime.value = TimeColumn.Empty;
            }
        }
    });
    date = new DateColumn({});
    visitTime = new TimeColumn();
    pickupTime = new TimeColumn();
    status = new RideStatusColumn();
    statusDate = new DateTimeColumn();

    isHasBabyChair = new BoolColumn({ caption: 'Have Babyseat?', defaultValue: false });
    isHasWheelchair = new BoolColumn({ caption: 'Wheelchair?', defaultValue: false });
    escortsCount = new NumberColumn({});


    did = new DriverIdColumn({ caption: 'Driver' }, this.context);
    pid = new PatientIdColumn(this.context);
    pMobile = new StringColumn({ caption: 'Patient Mobile' });
    importRideNum = new StringColumn();

    backId = new StringColumn({});
    isBackRide = new BoolColumn({ defaultValue: false });
    isPatientApprovedBeing = new BoolColumn({ defaultValue: false });
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
            validation: () => {
                if (this.fid.selected) {
                    let border = this.fid.selected.type.value === LocationType.border;
                    let immediate = this.immediate.value;
                    if (border) {//border
                        this.pickupTime.value = addHours(-2, this.visitTime.value);
                    }
                    else if (!border && immediate) {//hospital
                        this.visitTime.value = TimeColumn.Empty;
                        this.pickupTime.value = TimeColumn.Empty;
                        // if current time if after business working hours so set ride to tomorrow
                        let today = addDays(0);
                        if (today === this.date.value) {
                            let time = formatDate(addDays(0, undefined, false), 'HH:mm', 'en-US');
                            if (time > MaxPickupHospital) {
                                this.date.value = addDays(+1);
                            }
                        }
                    }
                    else if (!border && !immediate) {//hospital
                        this.visitTime.value = TimeColumn.Empty;
                    }
                    return true;
                }
                else {
                    console.error(`this.fid.selected=null (id=${this.fid.value})`);
                }
            },
            saving: async () => {
                if (context.onServer) {
                    if (this.status.wasChanged()) {
                        this.statusDate.value = addDays(TODAY);
                    }
                    this.changed.value = addDays(TODAY, undefined, false);
                    this.changedBy.value = this.context.user.id;
                }
            },
            deleted: async () => {//trigger from db on date OR status changed
                if (context.onServer) {
                    await this.recordActivity(this, true);
                }
            },
            saved: async () => {//trigger from db on date OR status changed
                if (context.onServer) {
                    await this.recordActivity(this);
                }
            }

        });
    }


    async recordActivity(r: Ride, deleted = false) {
        let desc = '';
        let remark = '';
        if (deleted || r.id.wasChanged() || r.date.wasChanged() || r.visitTime.wasChanged() || r.status.wasChanged() || r.escortsCount.wasChanged() || r.did.wasChanged()) {

            let history = r.context.for(RideActivity).create();
            history.rid.value = r.id.value;
            history.pid.value = r.pid.value;
            let from = (await r.context.for(Location).findId(r.fid.value)).name.value;//r.fid.selected ? r.fid.selected.name.value
            let to = (await r.context.for(Location).findId(r.tid.value)).name.value;//r.tid.selected ? r.tid.selected.name.value
            history.kav.value = `${from} > ${to}`;

            if (deleted) {
                desc = 'Deleted';
                remark = '';
            }
            else {
                let dateChaged = r.date.wasChanged();
                console.log('@@-- dateChaged: ' + dateChaged);
                if (dateChaged) {
                    if (r.date.originalValue && r.date.value) {
                        let o = formatDate(r.date.originalValue, 'dd.MM.yyyy', 'en-US');
                        let v = formatDate(r.date.value, 'dd.MM.yyyy', 'en-US');
                        if (o === v) {
                            dateChaged = false;
                        }
                    }
                }

                if (r.id.wasChanged()) {
                    desc = 'Created';
                }
                else if (dateChaged) {
                    desc = r.date.originalValue < r.date.value ? 'Date Later' : 'Date Earlier';
                    remark = `${r.date.originalValue ? formatDate(r.date.originalValue, 'dd.MM', 'en-US') : r.date.originalValue} ==> ${r.date.value ? formatDate(r.date.value, 'dd.MM', 'en-US') : r.date.value}`;
                }
                else if (r.visitTime.wasChanged()) {
                    desc = r.visitTime.originalValue < r.visitTime.value ? 'Visit-Time Later' : 'Date Earlier';
                    remark = `${r.visitTime.originalValue} ==> ${r.visitTime.value}`;
                }
                else if (r.escortsCount.wasChanged()) {
                    desc = r.escortsCount.originalValue < r.escortsCount.value ? 'Pass Added' : 'Pass Minimized';
                    remark = `${1 + r.escortsCount.originalValue} ==> ${1 + r.escortsCount.value}`;
                }
                else if (r.did.wasChanged()) {
                    desc = !r.did.originalValue && r.did.value ? 'Driver Set' : r.did.originalValue && !r.did.value ? 'Driver Removed' : 'Driver Replaced';
                    remark = `${r.did.selected ? r.did.selected.name.value : ''}: ${r.did.originalValue} ==> ${r.did.value}`;
                }
                else if (r.status.wasChanged()) {
                    desc = RideStatus.isForwarded(r.status.originalValue, r.status.value) ? 'Status Forward' : 'Status Not Forward';
                    remark = `${r.status.originalValue ? r.status.originalValue.id : r.status.originalValue} ==> ${r.status.value.id}`;
                }
                else if (r.fid.wasChanged() || r.tid.wasChanged()) {

                    let ofrom = r.fid.originalValue ? (await r.context.for(Location).findId(r.fid.originalValue)).name.value : r.fid.originalValue;
                    let oto = r.tid.originalValue ? (await r.context.for(Location).findId(r.tid.originalValue)).name.value : r.tid.originalValue;
                    desc = 'Kav Changed';
                    remark = `${ofrom}>${oto} ==> ${from}>${to}`;
                }
            }

            history.what.value = desc;
            history.values.value = remark;
            await history.save();
        }
    }

    print(r: Ride, dateChaged = false) {
        let message = '';
        message += `id(${r.id.wasChanged()}): ${r.id.originalValue} ==> ${r.id.value}`;
        message += '\n';
        message += `escortsCount(${r.escortsCount.wasChanged()}): ${r.escortsCount.originalValue} ==> ${r.escortsCount.value}`;
        message += '\n';
        message += `status(${r.status.wasChanged()}): ${r.status.originalValue} ==> ${r.status.value}`;
        message += '\n';
        message += `visitTime(${r.visitTime.wasChanged()}): ${r.visitTime.originalValue} ==> ${r.visitTime.value}`;
        message += '\n';
        message += `did(${r.did.wasChanged()}): ${r.did.originalValue} ==> ${r.did.value}`;
        message += '\n';
        message += `date(${dateChaged}): ${r.date.originalValue} ==> ${r.date.value}`;
        message += '\n';
        message += `fid(${r.fid.wasChanged()}): ${r.fid.originalValue} ==> ${r.fid.value}`;
        message += '\n';
        message += `tid(${r.tid.wasChanged()}): ${r.tid.originalValue} ==> ${r.tid.value}`;
        // message += '\n';
        // message += `tid.selected(${r.id.wasChanged()}): ${r.tid.selected}`;
        console.log(message);
    }

    hadBackRide() {
        return this.backId && this.backId.value && this.backId.value.length > 0;
    }

    passengers() {
        return 1 /*patient*/ + this.escortsCount.value;
    }

    isHasDate() {
        return this.date && this.date.value && this.date.value.getFullYear() > 1900;
    }

    isHasDriver() {
        return this.did && this.did.value && this.did.value.length > 0;
    }

    isHasPatient() {
        return this.pid && this.pid.value && this.pid.value.length > 0;
    }

    isHasVisitTime() {
        return this.visitTime && this.visitTime.value && this.visitTime.value.length > 0 && (!(this.visitTime.value === TimeColumn.Empty));
    }

    isHasPickupTime() {
        return this.pickupTime && this.pickupTime.value && this.pickupTime.value.length > 0 && (!(this.pickupTime.value === TimeColumn.Empty));
    }

    isExsistPatient(): boolean {
        return this.pid && this.pid.value && this.pid.value.length > 0;
    }

    isExsistBakcup(): boolean {
        return this.backId && this.backId.value && this.backId.value.length > 0;
    }

    isExsistDriver(): boolean {
        return this.did && this.did.value && this.did.value.length > 0;
    }

    isDriverCurrentlyDriving() {
        let inRiding: RideStatus[] = [
            RideStatus.waitingForPickup,
            RideStatus.waitingForArrived,];
        return this.isExsistDriver() && inRiding.includes(this.status.value);
    }



    isWaitingForDriverAccept() {
        return this.status.value === RideStatus.waitingForDriver;
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

    swapLocations() {
        let temp = this.fid.value;
        let slected = this.fid.selected;
        this.fid.value = this.tid.value;
        this.fid.selected = this.tid.selected;
        this.tid.value = temp;
        this.tid.selected = slected;
    }

    async createBackRide(ds?: DialogService): Promise<Ride> {
        let yes = false;
        if (ds) {
            yes = await ds.yesNoQuestion('Did patient release from hospital?');
        }
        let back = this.context.for(Ride).create();
        this.copyTo(back);
        back.swapLocations();
        back.status.value = RideStatus.stayInHospital;
        if (yes) {
            back.status.value = RideStatus.waitingForDriver;
        }
        back.isBackRide.value = true;
        back.did.value = '';
        await back.save();
        this.backId.value = back.id.value;
        await this.save();
        return back;
    }

    copyTo(target: Ride) {
        target.date.value = this.date.value;
        target.pMobile.value = this.pMobile.value;
        target.isHasBabyChair.value = this.isHasBabyChair.value;
        target.isHasWheelchair.value = this.isHasWheelchair.value;
        target.escortsCount.value = this.escortsCount.value;
        target.pid.value = this.pid.value;
        target.isSplitted.value = this.isSplitted.value;
        target.fid.value = this.fid.value;
        target.tid.value = this.tid.value;
        target.pickupTime.value = this.pickupTime.value;
        target.visitTime.value = this.visitTime.value;
        target.immediate.value = this.immediate.value;
        target.did.value = this.did.value;
        target.backId.value = this.backId.value;
        target.isBackRide.value = this.isBackRide.value;
        target.status = this.status;
        target.statusDate.value = this.statusDate.value;
        target.importRideNum.value = this.importRideNum.value;
        target.dRemark.value = this.dRemark.value;
        target.rRemark.value = this.rRemark.value;
    }

    toString() {
        return `${this.date.value} | ${this.fid.value} | ${this.tid.value} | ${this.status.value} | ${this.statusDate.value} | ${this.passengers()}`
    }
}

export class RideStatus {
    static InBorder = new RideStatus();
    static InHospital = new RideStatus();//ride-status OR patient-status
    static waitingForDriver = new RideStatus();
    static waitingForAccept = new RideStatus();
    static waitingForStart = new RideStatus();
    static waitingForPickup = new RideStatus();
    static waitingForArrived = new RideStatus();
    static waitingForEnd = new RideStatus();
    static succeeded = new RideStatus();//the king`s way
    static noFoundPatient = new RideStatus();
    static wrongAddress = new RideStatus();
    static stayInHospital = new RideStatus();
    static goneByHimself = new RideStatus();

    constructor(public color = 'green') { }
    id: string;

    // status.DriverNotStratedYet,
    //       status.DriverStratedButNotArrived,
    //       status.DriverArrived,

    static isForwarded(from: RideStatus, to: RideStatus): boolean {
        if (from === RideStatus.InBorder || from === RideStatus.InHospital) {
            return to === RideStatus.waitingForDriver;
        }
        else if (from === RideStatus.waitingForDriver) {
            return to === RideStatus.waitingForAccept || to === RideStatus.waitingForStart;
        }
        else if (from === RideStatus.waitingForAccept) {
            return to === RideStatus.waitingForStart;
        }
        else if (from === RideStatus.waitingForStart) {
            return to === RideStatus.waitingForPickup;
        }
        else if (from === RideStatus.waitingForPickup) {
            return to === RideStatus.waitingForArrived;
        }
        else if (from === RideStatus.waitingForArrived) {
            return to === RideStatus.waitingForEnd || to === RideStatus.succeeded;
        }
        return false;
    }

    isEquals(status: string) {
        return status === this.id;
    }

    static isInDriving = [
        RideStatus.waitingForPickup,
        RideStatus.waitingForArrived
    ];

    static NoUsherActionNeeded =[
        RideStatus.InBorder,
        RideStatus.InHospital,
        RideStatus.waitingForEnd,
        RideStatus.succeeded,
        RideStatus.stayInHospital,
        RideStatus.goneByHimself
    ];

    static isDriverNotStarted = [
        // RideStatus.waitingForHospital,
        RideStatus.waitingForDriver,
        RideStatus.waitingForAccept
    ];

    static isDriverNotStarted2 = [
        RideStatus.waitingForPickup,
        RideStatus.waitingForAccept
    ];

    static isInCanBackRideStatuses = [
        RideStatus.waitingForArrived,
    ];

    static isInMatcherCanApproveStatuses = [
        RideStatus.waitingForStart,
    ];

    static isInPatientWaitingStatuses = [
        RideStatus.stayInHospital,
        RideStatus.goneByHimself,
        RideStatus.noFoundPatient,
        RideStatus.InBorder,
        RideStatus.InHospital,
    ];

    static isInDriverWaitingStatuses = [
        RideStatus.waitingForAccept,
        RideStatus.waitingForDriver,
        RideStatus.waitingForStart,
        RideStatus.waitingForPickup,
        RideStatus.waitingForArrived,
        RideStatus.waitingForEnd,
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