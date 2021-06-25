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
    demo = true;
    pid = new PatientIdColumn(this.context);
    fid = new LocationIdColumn(this.context,{
        caption: 'From Location', allowNull: false,
        dataControlSettings: () => ({
            readOnly: RideStatus.isInDriving.includes(this.status.value)
        })
    });
    tid = new LocationIdColumn(this.context,{
        caption: 'To Location', allowNull: false,
        dataControlSettings: () => ({
            readOnly: RideStatus.isInDriving.includes(this.status.value)
        })
    });
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
    status = new RideStatusColumn({ defaultValue: RideStatus.w4_Driver });
    statusDate = new DateTimeColumn({ caption: 'Status Changed' });
    uSetDriver = new DateTimeColumn();
    dStart = new TimeColumn();
    dPickup = new TimeColumn();
    dArrived = new TimeColumn();
    dEnd = new TimeColumn();
    pMobile = new StringColumn({ caption: 'Patient Mobile' });
    isSplitted = new BoolColumn({ defaultValue: false });
    needBackRide = new BoolColumn({ defaultValue: false });
    isBackRide = new BoolColumn({ defaultValue: false });
    backId = new StringColumn({});
    importRideNum = new StringColumn();
    isPatientApprovedBeing = new BoolColumn({ defaultValue: false });
    dRemark = new StringColumn({ caption: 'Remark For Driver' });
    dFeedback = new StringColumn({ caption: 'Driver Feedback Comment' });
    rRemark = new StringColumn({ caption: 'Remark For Ride' });
    created = new DateTimeColumn();
    createdBy = new UserId(this.context);
    modified = new DateTimeColumn();
    modifiedBy = new UserId(this.context);

    constructor(private context: Context, private dialog: DialogService) {
        super({
            name: "rides",
            allowApiCRUD: [Roles.admin, Roles.usher, Roles.matcher],
            allowApiUpdate: [Roles.admin, Roles.usher, Roles.matcher, Roles.driver],
            allowApiRead: c => c.isSignedIn(),
            validation: () => {//on-saving
                // console.log(`ride.validation.trigger`);
                // if (this.demo) {
                //     if (!this.fid.selected && this.fid.value) {
                //         throw 'From Location is Required';
                //     }
                // }
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
                    // console.error(`this.fid.selected=null`);
                }
            },
            saving: async () => {
                if (context.onServer) {
                    // console.log(`ride.saving.trigger`);
                    if (this.status.wasChanged()) {
                        let now = addDays(TODAY, undefined, false);
                        let time = formatDate(now, 'HH:mm', "en-US");
                        this.statusDate.value = now;
                        if (this.status.value === RideStatus.w4_Start) {
                            this.uSetDriver.value = now;
                        }
                        else if (this.status.value === RideStatus.w4_Pickup) {
                            this.dStart.value = time;
                        }
                        else if (this.status.value === RideStatus.w4_Arrived) {
                            this.dPickup.value = time;
                        }
                        else if (this.status.value === RideStatus.Succeeded) {
                            this.dArrived.value = time;
                        }
                    }
                    if (this.isNew()) {
                        this.created.value = addDays(TODAY, undefined, false);
                        this.createdBy.value = this.context.user.id;
                    } else {
                        this.modified.value = addDays(TODAY, undefined, false);
                        this.modifiedBy.value = this.context.user.id;
                    }

                    ///////

                    if (this.demo) {// this.isNew() <=> this.created && !this.modified
                        if (this.status.wasChanged()) {// after status changed
                            let oo = '';
                            let o = this.status.originalValue;
                            if(o){
                                oo = o.id;
                            }
                            console.log(`Ride(${this.line()}, isBack=${this.isBackRide.value}).status.changed: ${oo} => ${this.status.value.id}`);
                            await this.status.value.args.setState(this, this.context);
                        }
                    }

                }
            },
            saved: async () => {//trigger from db on date OR status changed
                if (context.onServer) {
                    // console.log(`ride.saved.trigger`);
                    await this.recordActivity(this);



                }
            },
            deleted: async () => {//trigger from db on date OR status changed
                if (context.onServer) {
                    console.log(`ride.deleted.trigger`);
                    await this.recordActivity(this, true);

                    if (this.isBackRide.value) {
                        let origin = await context.for(Ride).findId(this.backId.value);
                        origin.backId.value = '';
                        await origin.save();
                    }
                    else {//origon
                        if (this.hadBackRide()) {
                            let back = await context.for(Ride).findId(this.backId.value);
                            await back.delete();
                        }
                    }
                }
            }

        });
    }

    line() {
        let result = '';
        if (this.fid.selected) {
            result += this.fid.selected.name.value;
        }
        if (this.tid.selected) {
            result += ' > ' + this.tid.selected.name.value;
        }
        if (result.length === 0) {
            result += 'no-selected';
        }
        return result;
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
                // console.log('@@-- dateChaged: ' + dateChaged);
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
                    desc = r.status.originalValue? r.status.originalValue.args.getNext().includes(r.status.value) ? 'Status Forward' : 'Status Not Forward': 'Status Initialized';
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

    hasId() {
        return this.id && this.id.value && this.id.value.length > 0 ? true : false;
    }

    hasBackId() {
        return this.backId && this.backId.value && this.backId.value.length > 0 ? true : false;
    }

    hadBackRide(alsoCheckIsBackRide = false) {
        let result = this.backId && this.backId.value && this.backId.value.length > 0 ? true : false;
        if (alsoCheckIsBackRide) {
            result = result && this.isBackRide.value ? true : false;
        }
        return result;
    }

    passengers() {
        return 1 /*patient*/ + this.escortsCount.value;
    }

    isHasDate() {
        return this.date && this.date.value && this.date.value.getFullYear() > 1900 ? true : false;
    }

    isHasDriver() {
        return this.did && this.did.value && this.did.value.length > 0 ? true : false;
    }

    isHasPatient() {
        return this.pid && this.pid.value && this.pid.value.length > 0 ? true : false;
    }

    isHasVisitTime() {
        return this.visitTime && this.visitTime.value && this.visitTime.value.length > 0 && (!(this.visitTime.value === TimeColumn.Empty)) ? true : false;
    }

    isHasPickupTime() {
        return this.pickupTime && this.pickupTime.value && this.pickupTime.value.length > 0 && (!(this.pickupTime.value === TimeColumn.Empty)) ? true : false;
    }

    isExsistPatient(): boolean {
        return this.pid && this.pid.value && this.pid.value.length > 0 ? true : false;
    }

    isExsistBakcup(): boolean {
        return this.backId && this.backId.value && this.backId.value.length > 0 ? true : false;
    }

    isExsistDriver(): boolean {
        return this.did && this.did.value && this.did.value.length > 0 ? true : false;
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

    isNotActiveYet() {
        return this.status.value === RideStatus.NotActiveYet;
    }
    
    isEnd() {
        return this.status.value === RideStatus.Succeeded;
    }

    async isBackSucceeded() {
        let backSucceeded = true;
      if(this.isBackRide.value)
      {
        if(this.hasBackId()){
          let origin = await this.context.for(Ride).findId(this.backId.value);
          if(origin){
            backSucceeded = [RideStatus.Succeeded].includes(origin.status.value);
          }
        } 
      }
      return backSucceeded;
    }

    isRideWaitForDriver() {
        let inRiding: RideStatus[] = [
            RideStatus.NotActiveYet,
            RideStatus.w4_Driver//,
            // RideStatus.w4_Start,
            // RideStatus.w4_Pickup,
            // RideStatus.w4_Arrived
        ];
        return inRiding.includes(this.status.value);//this.isExsistDriver() && 
    }
    isRideWaitForUsher() {
        let inRiding: RideStatus[] = [
            RideStatus.w4_Accept,
            RideStatus.w4_Driver,
            RideStatus.w4_Start,
            RideStatus.w4_Pickup,
            RideStatus.w4_Arrived
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
    async createBackRide(save = true): Promise<Ride> {
        let back = this.context.for(Ride).create();
        back.pid.value = this.pid.value;
        back.fid.value = this.tid.value;
        if (this.tid.selected) {
            back.fid.selected = new Location(this.context);
            back.fid.selected.name.value = this.tid.selected.name.value;
            back.fid.selected.type.value = this.tid.selected.type.value;
            back.fid.selected.area.value = this.tid.selected.area.value;
        }
        back.tid.value = this.fid.value;
        if (this.fid.selected) {
            back.tid.selected = new Location(this.context);
            back.tid.selected.name.value = this.fid.selected.name.value;
            back.tid.selected.type.value = this.fid.selected.type.value;
            back.tid.selected.area.value = this.fid.selected.area.value;
        }
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
        back.needBackRide.value = false;
        if (save) {
            await back.save();
        }
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
    static w4_Driver = new RideStatus({
        getNext: () => [RideStatus.w4_Accept, RideStatus.w4_Start],
        setState: async r => {
            if (r.isNew() && !r.hasBackId() && r.needBackRide.value && r.isBackRide.value === false) {
                let back = await r.createBackRide(false);
                back.backId.value = r.id.value;
                back.isBackRide.value = true;
                back.needBackRide.value = false;
                await back.save();
                r.backId.value = back.id.value;
                back.isBackRide.value = false;
                // await r.save();
            }
        }
    });
    static w4_Accept = new RideStatus({
        getNext: () => [RideStatus.w4_Start],
        setState: async () => {}
    });
    static w4_Start= new RideStatus({
        getNext: () => [RideStatus.w4_Pickup],
        setState: async () => {}
    });
    static w4_Pickup = new RideStatus({
        getNext: () => [RideStatus.w4_Arrived],
        setState: async () => {}
    });
    static w4_Arrived= new RideStatus({
        getNext: () => [RideStatus.Succeeded],
        setState: async () => {}
    });
    static counter = 0;
    // static w4_End = new RideStatus();
    static Succeeded = new RideStatus({
        getNext: () => [RideStatus.w4_Driver],
        setState: async (r, c) => {
            ++RideStatus.counter;
            if(RideStatus.counter > 5){
                RideStatus.counter = 0;
                return;
            }
            if (!r.isBackRide.value) {//=origin
                if (r.hasBackId()) {
                    let back = await c.for(Ride).findId(r.backId.value);
                    if (back) {
                        if(back.status.value !== RideStatus.InHospital){
                            back.status.value = RideStatus.InHospital;
                            await back.save();
                        }
                    }
                }
            } else {
                //the back-ride finished ok.
            }
        }
    });//the king`s way

    static NotActiveYet = new RideStatus();//{ color: 'gray' });//back-ride created before the patient arrived to hospital
    static InHospital = new RideStatus({
        getNext: () => [RideStatus.w4_Driver],
        // color: 'orange',
        setState: async (r, c) => {
            if (r.isBackRide.value) {
                let origin = await c.for(Ride).findId(r.backId.value);
                if (origin) {
                    // console.log('before: ' + origin.status.value.id);
                     if(origin.status.value !== RideStatus.Succeeded){
                         origin.status.value = RideStatus.Succeeded;
                        //  console.log('after: ' + origin.status.value.id);
                         await origin.save();
                    }
                }
            }
            else {//origin
                if(r.status.value !== RideStatus.Succeeded){
                r.status.value = RideStatus.Succeeded;
                // await r.save();
                }
                let back = await c.for(Ride).findId(r.backId.value);
                if (back) {
                    if(back.status.value !== RideStatus.InHospital){
                    back.status.value = RideStatus.InHospital;
                    await back.save();
                    }
                }
            }
        }
    });//ride-status OR patient-status
    static FinishedHospital = new RideStatus({
        getNext: () => [RideStatus.w4_Driver],
        setState: async (r, c) => {
            if (r.isBackRide.value) {
                let origin = await c.for(Ride).findId(r.backId.value);
                if (origin) {
                    if(origin.status.value !== RideStatus.Succeeded){
                    origin.status.value = RideStatus.Succeeded;
                    await origin.save();
                    }
                }
                if(r.status.value !== RideStatus.w4_Driver){
                    r.status.value = RideStatus.w4_Driver;
                    // await r.save();
                }
            }
            else {//origin
                if(r.status.value !== RideStatus.Succeeded){
                    r.status.value = RideStatus.Succeeded;
                    // await r.save();
                }

                let back = await c.for(Ride).findId(r.backId.value);
                if (back) {
                    if(back.status.value !== RideStatus.w4_Driver){
                    back.status.value = RideStatus.w4_Driver;
                    await back.save();
                    }
                }
                else {
                    back = await r.createBackRide(false);
                    back.backId.value = r.id.value;
                    back.isBackRide.value = true;
                    back.needBackRide.value = false;
                    await back.save();
                    r.backId.value = back.id.value;
                    r.isBackRide.value = false;
                    // await r.save();

                }
            }
        }
    });
    static StayInHospital = new RideStatus({
        getNext: () => [RideStatus.w4_Driver],
        setState: async (r, c) => {
            if (r.isBackRide.value) {
                r.date.value = addDays(+1, r.date.value);
                if( r.status.value !== RideStatus.InHospital){
                r.status.value = RideStatus.InHospital;
                }
                // await r.save();
            }
            else {//origin
                if(r.status.value !== RideStatus.Succeeded){
                r.status.value = RideStatus.Succeeded;
                // await r.save();
                }
                let back = await c.for(Ride).findId(r.backId.value);
                if (back) {
                    if(back.status.value !== RideStatus.InHospital){
                    back.status.value = RideStatus.InHospital;
                    await back.save();
                    }
                }
            }
        }
    });
    static GoneByHimself = new RideStatus({
        getNext: () => [RideStatus.w4_Driver],
        setState: async (r, c) => {
            if (r.isBackRide.value) {
                let origin = await c.for(Ride).findId(r.backId.value);
                if (origin) {
                    if(origin.status.value !== RideStatus.Succeeded){
                    origin.status.value = RideStatus.Succeeded;
                    await origin.save();
                    }
                }
                await r.delete();
            }
            else {//origin
                if(r.status.value!== RideStatus.Succeeded){
                r.status.value = RideStatus.Succeeded;
                // await r.save();
                
                }
                let back = await c.for(Ride).findId(r.backId.value);
                if (back) {
                    await back.delete();
                }
            }
        }
    });

    // static Other = new RideStatus('red');
    static PatientNotFound = new RideStatus();//{ color: 'red' });
    static WrongAddress = new RideStatus();//{ color: 'red' });

    constructor(public args?: {
        // color?: string,
        setState: (ride: Ride, context: Context) => Promise<void>,
        getNext: () => RideStatus[]
    }) {
        if (!this.args) {
            this.args = { setState: async () => {}, getNext: () => [RideStatus.w4_Driver] }
        }
        
        // if (!this.args.getNext) {
        //     this.args.getNext = () => [RideStatus.w4_Driver];
        // }
        // if (!args.color)
        //     args.color = 'green';
    }
    id: string;

    // status.DriverNotStratedYet,
    //       status.DriverStratedButNotArrived,
    //       status.DriverArrived,

    // static isForwarded(from: RideStatus, to: RideStatus): boolean {
    //     if (from === RideStatus.InHospital) {
    //         return to === RideStatus.w4_Driver;
    //     }
    //     else if (from === RideStatus.w4_Driver) {
    //         return to === RideStatus.w4_Accept || to === RideStatus.w4_Start;
    //     }
    //     else if (from === RideStatus.w4_Accept) {
    //         return to === RideStatus.w4_Start;//
    //     }
    //     else if (from === RideStatus.w4_Start) {
    //         return to === RideStatus.w4_Pickup;//
    //     }
    //     else if (from === RideStatus.w4_Pickup) {
    //         return to === RideStatus.w4_Arrived;
    //     }
    //     else if (from === RideStatus.w4_Arrived) {
    //         return to === RideStatus.Succeeded;
    //     }
    //     return false;
    // }

    // isEquals(status: string) {
    //     return status === this.id;
    // }

    static isDriverFeedback = [
        RideStatus.PatientNotFound,
        RideStatus.WrongAddress
    ];

    static isPatientArrivedToDestination = [
        RideStatus.Succeeded
    ];

    static isInDriving = [
        RideStatus.w4_Pickup,
        RideStatus.w4_Arrived
    ];

    static isNoUsherActionNeeded = [
        RideStatus.InHospital,
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
    constructor(options?: ColumnSettings<RideStatus>, all = false) {
        super(RideStatus, {
            defaultValue: { id: 'all'},
            dataControlSettings: () => (all
                ?{valueList: [{caption: 'all', id: 'all'}, ...this.getOptions()]}
                :{valueList: this.getOptions()}),
            ...options
        });
        this.getOptions()
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


                            /*
                                                        if (this.status.value === RideStatus.w4_Driver) {// origin=new
                                                            console.log(this.isNew());
                                                            console.log(this.hasBackId());
                                                            console.log(this.needBackRide.value);
                                                            console.log(this.isBackRide.value);
                                                            if (this.isNew() && !this.hasBackId() && this.needBackRide.value && this.isBackRide.value === false) {
                                                                let back = await this.createBackRide(false);
                                                                back.backId.value = this.id.value;
                                                                back.isBackRide.value = true;
                                                                back.needBackRide.value = false;
                                                                await back.save();
                                                                this.backId.value = back.id.value;
                                                                back.isBackRide.value = false;
                            
                                                            }
                                                        }
                                                        else if (this.status.value === RideStatus.w4_Accept) {//by driver
                                                        }
                                                        else if (this.status.value === RideStatus.w4_Start) {//by driver
                                                        }
                                                        else if (this.status.value === RideStatus.w4_Pickup) {//by driver
                                                        }
                                                        else if (this.status.value === RideStatus.WrongAddress) {//by driver
                                                        }
                                                        else if (this.status.value === RideStatus.PatientNotFound) {//by driver
                                                        }
                                                        else if (this.status.value === RideStatus.w4_Arrived) {//by driver
                                                        }
                                                        else if (this.status.value === RideStatus.Succeeded) {//origin.back?.value=RideStatus.InHospital;
                                                            if (!this.isBackRide.value) {//=origin
                                                                if (this.hasBackId()) {
                                                                    let back = await context.for(Ride).findId(this.backId.value);
                                                                    if (back) {
                                                                        back.status.value = RideStatus.InHospital;
                                                                        await back.save();
                                                                    }
                                                                }
                                                            } else {
                                                                //the back-ride finished ok.
                                                            }
                                                        }
                                                        else if (this.status.value === RideStatus.NotActiveYet) {//back created with origin (ride-crud)
                                                        }
                                                        else if (this.status.value === RideStatus.GoneByHimself) {//origin=Succeeded, back.delete()
                                                            if (this.isBackRide.value) {
                                                                let origin = await context.for(Ride).findId(this.backId.value);
                                                                if (origin) {
                                                                    origin.status.value = RideStatus.Succeeded;
                                                                    await origin.save();
                                                                }
                                                                await this.delete();
                                                            }
                                                            else {//origin
                                                                this.status.value = RideStatus.Succeeded;
                            
                                                                let back = await context.for(Ride).findId(this.backId.value);
                                                                if (back) {
                                                                    await back.delete();
                                                                }
                                                            }
                                                        }
                                                        else if (this.status.value === RideStatus.StayInHospital) {//origin=succeeded, back=InHospital
                                                            if (this.isBackRide.value) {
                                                                this.date.value = addDays(+1, this.date.value);
                                                                this.status.value = RideStatus.InHospital;
                            
                                                            }
                                                            else {//origin
                                                                this.status.value = RideStatus.Succeeded;
                            
                                                                let back = await context.for(Ride).findId(this.backId.value);
                                                                if (back) {
                                                                    back.status.value = RideStatus.InHospital;
                                                                    await back.save();
                                                                }
                                                            }
                                                        }
                                                        else if (this.status.value === RideStatus.InHospital) {//origin=succeeded, back=InHospital
                                                            if (this.isBackRide.value) {
                                                                let origin = await context.for(Ride).findId(this.backId.value);
                                                                if (origin) {
                                                                    origin.status.value = RideStatus.Succeeded;
                                                                    await origin.save();
                                                                }
                                                            }
                                                            else {//origin
                                                                this.status.value = RideStatus.Succeeded;
                            
                                                                let back = await context.for(Ride).findId(this.backId.value);
                                                                if (back) {
                                                                    back.status.value = RideStatus.InHospital;
                                                                    await back.save();
                                                                }
                                                            }
                                                        }
                                                        else if (this.status.value === RideStatus.FinishedHospital) {//origin=succeeded, back=w4_Driver
                                                            if (this.isBackRide.value) {
                                                                let origin = await context.for(Ride).findId(this.backId.value);
                                                                if (origin) {
                                                                    origin.status.value = RideStatus.Succeeded;
                                                                    await origin.save();
                                                                }
                                                                this.status.value = RideStatus.w4_Driver;
                            
                                                            }
                                                            else {//origin
                                                                this.status.value = RideStatus.Succeeded;
                            
                                                                let back = await context.for(Ride).findId(this.backId.value);
                                                                if (back) {
                                                                    back.status.value = RideStatus.w4_Driver;
                                                                    await back.save();
                                                                }
                                                                else {
                                                                    back = await this.createBackRide(false);
                                                                    back.backId.value = this.id.value;
                                                                    back.isBackRide.value = true;
                                                                    back.needBackRide.value = false;
                                                                    await back.save();
                                                                    this.backId.value = back.id.value;
                                                                    back.isBackRide.value = false;
                            
                                                                }
                                                            }
                                                        }
                                                        */