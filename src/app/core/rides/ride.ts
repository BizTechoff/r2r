import { formatDate } from "@angular/common";
import { BoolColumn, ColumnSettings, Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";
import { DialogService } from "../../common/dialog";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { TimeColumn, TODAY } from "../../shared/types";
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

    pid = new PatientIdColumn(this.context);
    fid = new LocationIdColumn({
        caption: 'From Location', allowNull: false,
        dataControlSettings: () => ({
            readOnly: RideStatus.isInDriving.includes(this.status.value)
        })
    }, this.context);
    tid = new LocationIdColumn({
        caption: 'To Location', allowNull: false,
        dataControlSettings: () => ({
            readOnly: RideStatus.isInDriving.includes(this.status.value)
        })
    }, this.context);
    did = new DriverIdColumn({ caption: 'Driver' }, this.context);
    date = new DateColumn({});
    immediate = new BoolColumn({
        caption: 'As Soon As Possible',
        defaultValue: false, valueChange: () => {
            if (this.immediate.value) {
                // this.date.value = addDays(TODAY);
                this.visitTime.value = TimeColumn.Empty;
                this.pickupTime.value = TimeColumn.Empty;
            }
        }
    });
    visitTime = new TimeColumn();
    pickupTime = new TimeColumn();
    escortsCount = new NumberColumn({});
    status = new RideStatusColumn();
    statusDate = new DateTimeColumn({ caption: 'Status Changed' });
    uSetDriver = new DateTimeColumn();
    dStart = new TimeColumn(); 
    dPickup = new TimeColumn();
    dArrived = new TimeColumn();
    dEnd = new TimeColumn(); 
    pMobile = new StringColumn({ caption: 'Patient Mobile' });
    isSplitted = new BoolColumn({ defaultValue: false });
    isBackRide = new BoolColumn({ defaultValue: true });
    backId = new StringColumn({});
    importRideNum = new StringColumn();
    isPatientApprovedBeing = new BoolColumn({ defaultValue: false });
    dRemark = new StringColumn({ caption: 'Remark For Driver' });
    dFeedback = new StringColumn({ caption: 'Driver Feedback Comment' });
    rRemark = new StringColumn({ caption: 'Remark For Ride' });
    changed = new DateTimeColumn();
    changedBy = new UserId(this.context);

    constructor(private context: Context, private dialog: DialogService) {
        super({
            name: "rides",
            allowApiCRUD: [Roles.admin, Roles.usher, Roles.matcher],
            allowApiUpdate: [Roles.admin, Roles.usher, Roles.matcher, Roles.driver],
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
                    }
                    else if (!border && !immediate) {//hospital
                        this.visitTime.value = TimeColumn.Empty;
                    }
                    return true;
                }
                else {
                    console.error(`this.fid.selected=null`);
                }
            },
            saving: async () => {
                if (context.onServer) {
                    if (this.status.wasChanged()) {
                        let now = addDays(TODAY, undefined, false);
                        let time = formatDate(now,'HH:mm',"en-US");
                        this.statusDate.value = now;
                        if(this.status.value === RideStatus.w4_Start){
                            this.uSetDriver.value = now;
                        }
                        else if(this.status.value === RideStatus.w4_Pickup){
                            this.dStart.value = time;
                        }
                        else if(this.status.value === RideStatus.w4_Arrived){
                            this.dPickup.value = time;
                        }
                        else if(this.status.value === RideStatus.Succeeded){
                            this.dArrived.value = time;
                        }
                        // else if(this.status.value === RideStatus.w4_End){
                        //     this.dEnd.value = now.toLocaleTimeString("he-il");
                        // }
                    }
                    this.changed.value = addDays(TODAY, undefined, false);
                    this.changedBy.value = this.context.user.id;
                }
            },
            deleted: async () => {//trigger from db on date OR status changed
                if (context.onServer) {
                    await this.recordActivity(this, true);
                    if (!this.isBackRide.value) {
                        if (this.hadBackRide()) {
                            let back = await context.for(Ride).findId(this.backId.value);
                            await back.delete();
                        }
                    }
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
            history.line.value = `${from} > ${to}`;
 
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
                    desc = 'Line Changed';
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

    isWaitingForDriverAccept() {
        return this.status.value === RideStatus.w4_Driver;
    }

    isWaitingForAccept() {
        return this.status.value === RideStatus.w4_Accept;
    }

    isWaitingForStart() {
        return this.status.value === RideStatus.w4_Start;
    }

    isWaitingForPickup() {
        return this.status.value === RideStatus.w4_Pickup;
    }

    isWaitingForArrived() {
        return this.status.value === RideStatus.w4_Arrived;
    }

    isEnd() {
        return this.status.value === RideStatus.Succeeded;
    }

    
    isRideWaitForDriver() {
        let inRiding: RideStatus[] = [
            RideStatus.w4_Accept,
            RideStatus.w4_Driver,
            RideStatus.w4_Start,
            RideStatus.w4_Pickup,
            RideStatus.w4_Arrived,
            RideStatus.w4_End
        ];
        return this.isExsistDriver() && inRiding.includes(this.status.value);
    }
    isRideWaitForUsher() {
        let inRiding: RideStatus[] = [
            RideStatus.w4_Accept,
            RideStatus.w4_Driver,
            RideStatus.w4_Start,
            RideStatus.w4_Pickup,
            RideStatus.w4_Arrived,
            RideStatus.w4_End
        ];
        return this.isExsistDriver() && inRiding.includes(this.status.value);
    }
    isDriverCurrentlyDriving() {
        let inRiding: RideStatus[] = [
            RideStatus.w4_Pickup,
            RideStatus.w4_Arrived,];
        return this.isExsistDriver() && inRiding.includes(this.status.value);
    }
    isInDriving() {
        return RideStatus.isInDriving.includes(this.status.value);
    }


    async swapLocations() {
        let temp = this.fid.value;
        let selected = this.fid.selected;
        this.fid.value = this.tid.value;
        this.fid.selected = this.tid.selected;
        this.tid.value = temp;
        this.tid.selected = selected;
    }
    //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    async createBackRide(): Promise<Ride> {
        let back = this.context.for(Ride).create();
        back.pid.value = this.pid.value;
        back.fid.value = this.tid.value;
        back.fid.selected = this.tid.selected;
        back.tid.value = this.fid.value;
        back.tid.selected = this.fid.selected;
        back.date.value = this.date.value;
        back.immediate.value = true;
        back.visitTime.value = TimeColumn.Empty;
        back.pickupTime.value = TimeColumn.Empty;
        back.escortsCount.value = this.escortsCount.value;
        back.pMobile.value = this.pMobile.value;
        back.backId.value = this.id.value;
        back.isBackRide.value = true;
        back.dRemark.value = this.dRemark.value;
        back.rRemark.value = this.rRemark.value;
        back.status.value = RideStatus.NotActiveYet;
        await back.save();
        return back;
    }

    copyTo(target: Ride) {
        target.pid.value = this.pid.value;
        target.fid.value = this.fid.value;
        target.tid.value = this.tid.value;
        target.did.value = this.did.value;
        target.date.value = this.date.value;
        target.visitTime.value = this.visitTime.value;
        target.pickupTime.value = this.pickupTime.value;
        target.immediate.value = this.immediate.value;
        target.escortsCount.value = this.escortsCount.value;
        target.pMobile.value = this.pMobile.value;
        target.status = this.status;
        target.statusDate.value = this.statusDate.value;
        target.backId.value = this.backId.value;
        target.isSplitted.value = this.isSplitted.value;
        target.isBackRide.value = this.isBackRide.value;
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
    static w4_Accept = new RideStatus();
    static w4_Driver = new RideStatus();
    static w4_Start = new RideStatus();
    static w4_Pickup = new RideStatus();
    static w4_Arrived = new RideStatus();
    static w4_End = new RideStatus();
    static Succeeded = new RideStatus();//the king`s way
    
    static NotActiveYet = new RideStatus('gray');//back-ride created before the patient arrived to hospital
    static InHospital = new RideStatus('orange');//ride-status OR patient-status
    static FinishedHospital = new RideStatus();
    static StayInHospital = new RideStatus();
    static GoneByHimself = new RideStatus();

    // static Other = new RideStatus('red');
    static PatientNotFound = new RideStatus('red');
    static WrongAddress = new RideStatus('red');
    
    constructor(public color = 'green') { }
    id: string;

    // status.DriverNotStratedYet,
    //       status.DriverStratedButNotArrived,
    //       status.DriverArrived,

    static isForwarded(from: RideStatus, to: RideStatus): boolean {
        if (from === RideStatus.InBorder || from === RideStatus.InHospital) {
            return to === RideStatus.w4_Driver;
        }
        else if (from === RideStatus.w4_Driver) {
            return to === RideStatus.w4_Accept || to === RideStatus.w4_Start;
        }
        else if (from === RideStatus.w4_Accept) {
            return to === RideStatus.w4_Start;
        }  
        else if (from === RideStatus.w4_Start) {
            return to === RideStatus.w4_Pickup;
        }
        else if (from === RideStatus.w4_Pickup) {
            return to === RideStatus.w4_Arrived;
        }
        else if (from === RideStatus.w4_Arrived) {
            return to === RideStatus.w4_End || to === RideStatus.Succeeded;
        }
        return false;
    }

    isEquals(status: string) {
        return status === this.id;
    }

    static isDriverFeedback = [
        RideStatus.PatientNotFound, 
        RideStatus.WrongAddress
    ];

    static PatientArrivedToDestination = [
        RideStatus.w4_End,
        RideStatus.Succeeded
    ];

    static isInDriving = [
        RideStatus.w4_Pickup,
        RideStatus.w4_Arrived
    ];

    static NoUsherActionNeeded = [
        RideStatus.InBorder,
        RideStatus.InHospital,
        RideStatus.w4_End,
        RideStatus.Succeeded,
        RideStatus.StayInHospital,
        RideStatus.GoneByHimself
    ];

    static isDriverNotStarted = [
        // RideStatus.waitingForHospital,
        RideStatus.w4_Driver,
        RideStatus.w4_Accept
    ];

    static isCanNotDeleteRide = [
        //RideStatus.w,
        RideStatus.w4_Driver,
        RideStatus.w4_Accept
    ];

    static isDriverNotStarted2 = [
        RideStatus.w4_Pickup,
        RideStatus.w4_Accept
    ];

    static isInCanBackRideStatuses = [
        RideStatus.w4_Arrived,
    ];

    static isInMatcherCanApproveStatuses = [
        RideStatus.w4_Start,
    ];

    static isInPatientWaitingStatuses = [
        RideStatus.StayInHospital,
        RideStatus.GoneByHimself,
        RideStatus.PatientNotFound,
        RideStatus.InBorder,
        RideStatus.InHospital,
    ];

    static isDriverNeedToShowStatuses = [
        RideStatus.w4_Accept,
        RideStatus.w4_Driver,
        RideStatus.w4_Start,
        RideStatus.w4_Pickup,
        RideStatus.w4_Arrived//,
        //RideStatus.waitingForEnd,
    ];
}

//חולה ונהג יכולים להיות ריקים
export class RideStatusColumn extends ValueListColumn<RideStatus>{
    constructor(options?: ColumnSettings<RideStatus>) {
        super(RideStatus, {
            defaultValue: RideStatus.w4_Driver,
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