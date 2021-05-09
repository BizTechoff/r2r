import { formatDate } from "@angular/common";
import { ColumnSettings, Context, DateColumn, Filter, ServerFunction, ValueListColumn } from "@remult/core";
import { getRideList4UsherParams, ride4Usher, ride4UsherApprove, ride4UsherSetDriver } from "../../shared/types";
import { Utils } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { Driver } from "../drivers/driver";
import { DriverPrefs } from "../drivers/driverPrefs";
import { Patient } from "../patients/patient";
import { Ride, RideStatus, RideStatusColumn } from "../rides/ride";
import { Location } from "./../locations/location";
import { MabatGroupBy } from "./mabat";


export class GroupType {
    static suggested = new GroupType(s => s.isIn(...[RideStatus.suggestedByDriver]));
    static registered = new GroupType(s => s.isIn(...[RideStatus.waitingForStart]));
    static other = new GroupType(s => new Filter(x => { }));
    constructor(public filter: (status: RideStatusColumn) => Filter) { }
    id;
} 

export class GroupField4Usher {
    static date = new GroupField4Usher();
    static dayPeriod = new GroupField4Usher();
    static from = new GroupField4Usher();
    static to = new GroupField4Usher();
    static root = new GroupField4Usher();
    id;
}

export interface UsherRideGroup {
    field: MabatGroupBy,
    title: string,
    rows: UsherRideRow[],
    groups: UsherRideGroup[],
}

export interface UsherRideRow {
    id: string,
    date: Date,
    visitTime: Date,
    from: string,
    to: string,
    passengers: number,
    days: number,
    status: RideStatus,
    statusDate: Date,
    pid: string,
    pName?: string,
    pAge?: number,
    pMobile?: string,
    did: string,
    dName?: string,
    dMobile?: string,
    icons?: string[],
}
export interface rides4UsherGroup {
    field: GroupField4Usher,
    title: string,
    rows: rides4UsherRow[],
    groups: rides4UsherGroup[],
};
export interface rides4UsherRow {

    id: string,
    date: Date,
    from: string,
    to: string,
    patinetName: string,
    patinetAge: number,
    passengers: number,
    patientMobile: string,
    driverName: string,
    status: string,
    statusDate: Date,
    icons: { name: string, desc: string }[],
    groupByLocation: boolean,
    ids: string[],
}

export interface Mabat {
    id?: string
    name: string,
    group?: UsherRideGroup,
    groupBy1Level?: string,
};

export class Usher {

    // static fromDemoTodayMidnight: Date = new Date(2021, 3, 12);
    // static toDemoTodayMidnight: Date = new Date(2021, 3, 13);
    // static fromDemoTodayMidnight: Date = new Date(2021, 0, 1);
    // static toDemoTodayMidnight: Date = new Date(2021, 12, 31);
    static fromDemoTodayMidnight: Date = new Date(2021, 3, 11);
    static toDemoTodayMidnight: Date = new Date(2021, 3, 12);
    static todayMidnight;
    static tomorrowMidnight;

    static mabat: Mabat = { name: "root-default" };

    static getRideList4UsherQuery(r:Ride,params: getRideList4UsherParams){
        // console.log(params)
        //r.date.value.getTime() === params.date.getTime()?new Filter(x => { /* true */ }):Filter

        return r.date.isEqualTo(params.date)
        .and(r.status.isNotIn(...[RideStatus.succeeded]))
        .and(params.fromId && (params.fromId.length > 0) ? r.fromLocation.isEqualTo(params.fromId) : new Filter(x => { /* true */ }))
        .and(params.toId && (params.toId.length > 0) ? r.toLocation.isEqualTo(params.toId) : new Filter(x => { /* true */ }));
    }

    @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
    static async getRideList4Usher2(params: getRideList4UsherParams, context?: Context): Promise<ride4Usher[]> {
        let result: ride4Usher[] = [];

        let date = await Utils.getServerDate();//params.date;
        for await (const ride of context.for(Ride).iterate({
            where: r => (r.date.isEqualTo(date)),
                // .and(r.status.isEqualTo(RideStatus.waitingForDriver)),
            orderBy: r => [{ column: r.date, descending: false }, { column: r.dayPeriod, descending: true }],
        })) {
            // console.log("@@@@");
        }
        // console.log(result.length);
        return result;
    }

    @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
    static async getRideList4Usher(params: getRideList4UsherParams, context?: Context): Promise<ride4Usher[]> {
        var result: ride4Usher[] = [];
        params = {
           date: new Date(2021,2,3),// await Utils.getServerDate(),// params.date,
           fromId: params.fromId,
           toId: params.toId,  
        };
        
        for await (const ride of context.for(Ride).iterate({
            where: r => r.date.isEqualTo(params.date)
            .and(r.status.isNotIn(...[RideStatus.succeeded]))
            .and(params.fromId && (params.fromId.length > 0) ? r.fromLocation.isEqualTo(params.fromId) : new Filter(x => { /* true */ }))
            .and(params.toId && (params.toId.length > 0) ? r.toLocation.isEqualTo(params.toId) : new Filter(x => { /* true */ })),
        })) { 
            let from = (await context.for(Location).findId(ride.fromLocation.value)).name.value;
            let to = (await context.for(Location).findId(ride.toLocation.value)).name.value;
            let key = `${from}-${to}`;

            let row = result.find(r => r.key === key);
            if (!(row)) {
                row = {
                    key: key,
                    fromId: ride.fromLocation.value,
                    toId: ride.toLocation.value,
                    from: from,
                    to: to,
                    inProgress: 0,
                    needApprove: 0,
                    needDriver: 0,
                    passengers: 0,
                    ridesCount: 0,
                    ids: [],
                };
                result.push(row);
            }

            row.inProgress += ([RideStatus.waitingForPickup, RideStatus.waitingForArrived].includes(ride.status.value) ? 1 : 0);
            row.needApprove += (ride.status.value == RideStatus.waitingForUsherApproove ? 1 : 0);
            row.needDriver += (ride.isHasDriver() ? 0 : 1);
            row.passengers += ride.passengers();
            row.ridesCount += 1;
        }

        // console.log(result)
        result.sort((r1, r2) => r1.from.localeCompare(r2.from));

        return result;
    }

    @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
    static async getRideList4UsherApprove(params: getRideList4UsherParams, context?: Context): Promise<ride4UsherApprove[]> {
        var result: ride4UsherApprove[] = [];
        params = {
           date: new Date(2021,2,3),// params.date,
           fromId: params.fromId,
           toId: params.toId,  
        };
        
        for await (const ride of context.for(Ride).iterate({
            where: r => r.date.isEqualTo(params.date)
            .and(r.status.isNotIn(...[RideStatus.succeeded]))
            .and(params.fromId && (params.fromId.length > 0) ? r.fromLocation.isEqualTo(params.fromId) : new Filter(x => { /* true */ }))
            .and(params.toId && (params.toId.length > 0) ? r.toLocation.isEqualTo(params.toId) : new Filter(x => { /* true */ })),
        })) { 
            let from = (await context.for(Location).findId(ride.fromLocation.value)).name.value;
            let to = (await context.for(Location).findId(ride.toLocation.value)).name.value;
            let driver= ride.isHasDriver()? (await context.for(Driver).findId(ride.driverId.value)).name.value : "";
            let patient= ride.isHasPatient()? (await context.for(Patient).findId(ride.patientId.value)).name.value : "";

            let row = result.find(r => r.id === ride.id.value);
            if (!(row)) {
                row = {
                    id: ride.id.value,
                    patientId: ride.patientId.value,
                    driverId: ride.driverId.value,
                    from: from,
                    to: to,
                    driver: driver,
                    patient: patient,
                    dMobile: "",
                    passengers: ride.passengers(),
                    selected: false,
                    visitTime: ride.visitTime.value,
                };
                result.push(row);
            }
        }

        // console.log(result)
        result.sort((r1, r2) => r1.from.localeCompare(r2.from));

        return result;
    }

    @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
    static async getRideList4UsherSetDriver(params: getRideList4UsherParams, context?: Context): Promise<ride4UsherSetDriver[]> {
        var result: ride4UsherSetDriver[] = [];
        params = {
           date: new Date(2021,2,3),// params.date,
           fromId: params.fromId,
           toId: params.toId,  
        };
        
        for await (const ride of context.for(Ride).iterate({
            where: r => r.date.isEqualTo(params.date)
            .and(r.status.isNotIn(...[RideStatus.succeeded]))
            .and(params.fromId && (params.fromId.length > 0) ? r.fromLocation.isEqualTo(params.fromId) : new Filter(x => { /* true */ }))
            .and(params.toId && (params.toId.length > 0) ? r.toLocation.isEqualTo(params.toId) : new Filter(x => { /* true */ })),
        })) { 
            let from = (await context.for(Location).findId(ride.fromLocation.value)).name.value;
            let to = (await context.for(Location).findId(ride.toLocation.value)).name.value;
            let driver= ride.isHasDriver()? (await context.for(Driver).findId(ride.driverId.value)).name.value : "";
            let patient= ride.isHasPatient()? (await context.for(Patient).findId(ride.patientId.value)).name.value : "";

            let row = result.find(r => r.id === ride.id.value);
            if (!(row)) {
                row = {
                    id: ride.id.value,
                    patientId: ride.patientId.value,
                    driverId: ride.driverId.value,
                    from: from,
                    to: to,
                    driver: driver,
                    patient: patient,
                    dMobile: "",
                    passengers: ride.passengers(),
                    selected: false,
                    visitTime: ride.visitTime.value,
                };
                result.push(row);
            }
        }

        console.log(result)
        result.sort((r1, r2) => r1.from.localeCompare(r2.from));

        return result;
    }

    @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
    static async getRides4Usher(driverId: string = "", context?: Context): Promise<UsherRideGroup> {

        let result: UsherRideGroup = {
            field: MabatGroupBy.root,
            title: "Driver Rides",
            rows: [],
            groups: []
        };

        if (!(context)) {
            console.log("getRides4Usher: context = null");
            return result;
        }

        let now = new Date();// server date
        Usher.todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let tomorrow = addDays(1);
        Usher.tomorrowMidnight = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

        console.time("getRides4Usher");
        let rides = await context.for(Ride).find({
            where: r => r.date.isGreaterOrEqualTo(Usher.fromDemoTodayMidnight).and(r.date.isLessOrEqualTo(Usher.toDemoTodayMidnight))//todo: change to todayMidnight
                .and(r.status.isNotIn(...[RideStatus.succeeded])),
            orderBy: r => [
                { column: r.date, descending: false },
                { column: r.dayPeriod, descending: true },
                // { column: r.fromLocation, descending: false, },//todo: sort by fromLocation.getName()?
                // { column: r.toLocation, descending: false },
            ],
        });
        console.log(`Found: ${rides.length} rows`);
        for (const r of rides) {

            // console.timeStamp("getRides4Usher");
            await Usher.addToGroup(result, r, context);
            result.rows.sort((r1, r2) => r1.pName.localeCompare(r2.pName));
            result.groups.sort((g1, g2) => g1.title.localeCompare(g2.title));
        }
        console.timeEnd("getRides4Usher");
        return result;
    }

    //recursive function
    private static async addToGroup(g: UsherRideGroup, r: Ride, context: Context) {

        let current = g.field;
        let nextG = MabatGroupBy.nextGroupBy(g.field);

        if (nextG.id === MabatGroupBy.none.id) {
            let row = await Usher.buildUserRideRow(r, context);
            g.rows.push(row);
            g.rows.sort((r1, r2) => r1.pName.localeCompare(r2.pName));
            return;//break condition
        }

        let title = await Usher.getTitle(nextG, r, context);
        if (title.length > 0) {
            let group = g.groups.find(grp => grp.title === title);
            if (!(group)) {
                group = { title: title, rows: [], groups: [], field: nextG };
                g.groups.push(group);
            }
            await Usher.addToGroup(group, r, context);//recursive call
            group.groups.sort((g1, g2) => g1.title.localeCompare(g2.title));
        }
        else {
            console.log(`addToGroup: title empty`);
        }
    }

    private static async getTitle(groupBy: MabatGroupBy, r: Ride, context: Context) {
        let result = '';
        switch (groupBy) {
            case MabatGroupBy.date: {
                let rDateMidnight = new Date(r.date.value.getFullYear(), r.date.value.getMonth(), r.date.value.getDate());
                result = rDateMidnight.getTime() === Usher.todayMidnight.getTime()
                    ? "Today"
                    : rDateMidnight.getTime() === Usher.tomorrowMidnight.getTime()
                        ? "Tomorrow"
                        : formatDate(rDateMidnight, 'dd/MM/yyyy', 'en-US');
                break;
            }
            case MabatGroupBy.period: {
                result = r.dayPeriod.value.id;
                break;
            }

            case MabatGroupBy.dateperiod: {
                result = `${await this.getTitle(MabatGroupBy.date, r, context)} - ${await this.getTitle(MabatGroupBy.period, r, context)}`;
                break;
            }

            case MabatGroupBy.driver: {
                result = (await context.for(Driver).findId(r.driverId.value)).name.value;
                break;
            }

            case MabatGroupBy.patient: {
                result = (await context.for(Patient).findId(r.patientId.value)).name.value;
                break;
            }

            case MabatGroupBy.from: {
                if (r.fromLocation.value) {
                    result = (await context.for(Location).findId(r.fromLocation.value)).name.value;
                }
                else {
                    result = "No_From";
                }
                break;
            }
            case MabatGroupBy.to: {
                if (r.toLocation.value) {
                    result = "> " + (await context.for(Location).findId(r.toLocation.value)).name.value;
                }
                else {
                    result = "No_To";
                }
                break;
            }

            case MabatGroupBy.fromto: {
                result = `${await this.getTitle(MabatGroupBy.from, r, context)} ${await this.getTitle(MabatGroupBy.to, r, context)}`;
                break;
            }
            case MabatGroupBy.status: {
                result = r.status.value.id;
                break;
            }
        }
        return result;
    }

    private static async buildUserRideRow(ride: Ride, context: Context): Promise<UsherRideRow> {

        let today = Usher.todayMidnight;
        let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());
        let diff = +today - +rDate;
        let days = (-1 * (Math.ceil(diff / 1000 / 60 / 60 / 24) + 1));

        let icons: string[] = [];
        if (ride.isHasBabyChair.value) {
            icons.push("child_friendly");
        }
        if (ride.isHasWheelchair.value) {
            icons.push("accessible");
        }
        if (ride.isHasExtraEquipment.value) {
            icons.push("home_repair_service");
        }

        let phones = "";
        let p = await context.for(Patient).findId(ride.patientId.value);
        if (p && p.mobile && p.mobile.value) {
            phones = p.mobile.value;
        }
        let dName = "";
        let d = await context.for(Driver).findId(ride.driverId.value);
        if (d && d.name) {
            dName = d.name.value;
        }
        let from = (await context.for(Location).findId(ride.fromLocation.value)).name.value;
        let to = (await context.for(Location).findId(ride.toLocation.value)).name.value;

        let result: UsherRideRow = {
            pid: p.id.value,
            pName: p.name.value,
            pAge: p.age(),
            pMobile: p.mobile.value,
            icons: icons,
            did: d.id.value,
            dName: dName,
            dMobile: d.mobile.value,
            id: ride.id.value,
            date: ride.date.value,
            visitTime: ride.visitTime.value,
            days: days,
            status: ride.status.value.id,
            statusDate: ride.statusDate.value,
            from: from,
            to: to,
            passengers: ride.passengers(),
        };

        return result;
    }

    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getUsherRides(mabatId: string, context?: Context): Promise<UsherRideGroup[]> {
        let result: UsherRideGroup[] = [];

        // let mabat = await context.for(Mabat).findId(mabatId);
        // if (mabat) {
        //     let today = await Utils.getServerDate();
        //     let tomorrow = addDays(1);
        //     let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        //     let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00                    

        //     for await (const ride of context.for(Ride).iterate({
        //         where: r => (r.date.isGreaterOrEqualTo(todayDate)),
        //         orderBy: r => [{ column: r.date, descending: false }, { column: r.dayPeriod, descending: true }, { column: r.from, descending: true }],
        //     })) {

        //         let row = await this.buildUserRideRow(ride, todayDate, context);
        //         let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

        //         let title = '';
        //         // if (mabat.groupBy1Level && mabat.groupBy1Level.value) {
        //         //     //MabatGroupBy.dateAndPeriod
        //         //     title = await Usher.newMethod(mabat, rDate, todayDate, tomorrowDate, ride, title, row, context);
        //         // }

        //         // if (title.length > 0) {
        //         //     let group = result.find(grp => grp.title === title);
        //         //     if (!(group)) {
        //         //         group = { title: title, rows: [], groups: [], field:GroupField4Usher.root, isLeaf: false };
        //         //         result.push(group);
        //         //     }

        //         //     // let r = group.rows.find(r => key === `${r.from}-${r.to}`);
        //         //     // if (r) {
        //         //     //     r.ids.push(row.id);
        //         //     //     r.passengers += row.passengers;
        //         //     // }
        //         //     // else {
        //         //     //     r = row;
        //         //     //     r.ids.push(row.id);
        //         //     //     r.groupByLocation = true;
        //         //     //     r.icons = [];
        //         //     //     group.rows.push(r);
        //         //     // }
        //         // }
        //     }
        // }
        return result;
    }


    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getWaitingRides4Driver(context?: Context, groupByFromAndTo = false): Promise<ridesWaiting4Driver[]> {
        let result: ridesWaiting4Driver[] = [];

        let today = await Utils.getServerDate();
        let tomorrow = addDays(1);
        let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

        for await (const ride of context.for(Ride).iterate({
            where: r => (r.date.isEqualTo(todayDate)),
                // .and(r.status.isEqualTo(RideStatus.waitingForDriver)),
            orderBy: r => [{ column: r.date, descending: false }, { column: r.dayPeriod, descending: true }],
        })) {

            // Build Row
            let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

            let date = rDate.getTime() === todayDate.getTime()
                ? "Today"
                : rDate.getTime() === tomorrowDate.getTime()
                    ? "Tomorrow"
                    : formatDate(rDate.getTime(), "dd/MM/yyyy", 'en-US');//todo:'he-IL';
            let period = ride.dayPeriod.value.id;

            let icons: { name: string, desc: string }[] = [];
            if (ride.isHasBabyChair.value) {
                icons.push({ name: "child_friendly", desc: "Has Babychair" });
            }
            if (ride.isHasWheelchair.value) {
                icons.push({ name: "accessible", desc: "Has Wheelchair" });
            }
            if (ride.isHasExtraEquipment.value) {
                icons.push({ name: "home_repair_service", desc: "Has Extra Equipment" });
            }

            let phones = "";
            let p = await context.for(Patient).findId(ride.patientId.value);
            if (p && p.mobile && p.mobile.value) {
                phones = p.mobile.value;
            }

            let title = `${date} - ${period}`;
            let group = result.find(grp => grp.title === title);
            if (!(group)) {
                group = { title: title, rows: [] };
                result.push(group);
            }

            let row: rides4Usher = {
                patinetName: '',
                patinetAge: 0,
                patientMobile: '',
                ids: [],
                icons: icons,
                groupByLocation: groupByFromAndTo,
                driverName: ride.isExsistDriver() ? (await context.for(Driver).findId(ride.driverId.value)).name.value : "",
                id: ride.id.value,
                date: ride.date.value,
                status: ride.status.value.id,
                statusDate: ride.statusDate.value,
                from: (await context.for(Location).findId(ride.fromLocation.value)).name.value,
                to: (await context.for(Location).findId(ride.toLocation.value)).name.value,
                passengers: ride.passengers(),
            };

            if (groupByFromAndTo) {
                let key = `${ride.fromLocation}-${row.to}`;
                let r = group.rows.find(r => key === `${r.from}-${r.to}`);
                if (r) {
                    r.ids.push(row.id);
                    r.passengers += row.passengers;
                }
                else {
                    r = row;
                    r.ids.push(row.id);
                    r.groupByLocation = true;
                    r.icons = [];
                    group.rows.push(r);
                }
            }
            else {
                group.rows.push(row);
            }
        }
        console.log(result.length);
        return result;
    }

    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getSuggestedRidesIdsByDrivers(context?: Context, groupByFromAndTo = false): Promise<string[]> {
        let result: string[] = [];
        for await (const group of await this.getSuggestedRidesByDrivers(context, groupByFromAndTo)) {
            for (const ride of group.rows) {
                result.push(ride.id);
            }
        }
        return result;
    }

    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getSuggestedRidesByDrivers(context?: Context, groupByFromAndTo = false): Promise<ridesNoPatient[]> {
        let result: ridesNoPatient[] = [];

        let today = await Utils.getServerDate();
        let tomorrow = addDays(1);
        let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

        for await (const ride of context.for(Ride).iterate({
            where: r => (r.date.isGreaterOrEqualTo(todayDate))
                .and(r.status.isEqualTo(RideStatus.suggestedByDriver)),
            orderBy: r => [{ column: r.date, descending: false }, { column: r.dayPeriod, descending: true }],
        })) {

            // Build Row
            let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

            let date = rDate.getTime() === todayDate.getTime()
                ? "Today"
                : rDate.getTime() === tomorrowDate.getTime()
                    ? "Tomorrow"
                    : formatDate(rDate.getTime(), "dd/MM/yyyy", 'en-US');//todo:'he-IL';
            let period = ride.dayPeriod.value.id;

            let icons: { name: string, desc: string }[] = [];
            if (ride.isHasBabyChair.value) {
                icons.push({ name: "child_friendly", desc: "Has Babychair" });
            }
            if (ride.isHasWheelchair.value) {
                icons.push({ name: "accessible", desc: "Has Wheelchair" });
            }
            if (ride.isHasExtraEquipment.value) {
                icons.push({ name: "home_repair_service", desc: "Has Extra Equipment" });
            }

            let phones = "";
            let p = await context.for(Patient).findId(ride.patientId.value);
            if (p && p.mobile && p.mobile.value) {
                phones = p.mobile.value;
            }

            let title = `${date} - ${period}`;
            let group = result.find(grp => grp.title === title);
            if (!(group)) {
                group = { title: title, rows: [] };
                result.push(group);
            }

            let row: rides4Usher = {
                patinetName: '',
                patinetAge: 0,
                patientMobile: '',
                ids: [],
                icons: icons,
                groupByLocation: groupByFromAndTo,
                driverName: ride.isExsistDriver() ? (await context.for(Driver).findId(ride.driverId.value)).name.value : "",
                id: ride.id.value,
                date: ride.date.value,
                status: ride.status.value.id,
                statusDate: ride.statusDate.value,
                from: (await context.for(Location).findId(ride.fromLocation.value)).name.value,
                to: (await context.for(Location).findId(ride.toLocation.value)).name.value,
                passengers: ride.passengers(),
            };

            if (groupByFromAndTo) {
                let key = `${ride.fromLocation}-${row.to}`;
                let r = group.rows.find(r => key === `${r.from}-${r.to}`);
                if (r) {
                    r.ids.push(row.id);
                    r.passengers += row.passengers;
                }
                else {
                    r = row;
                    r.ids.push(row.id);
                    r.groupByLocation = true;
                    r.icons = [];
                    group.rows.push(r);
                }
            }
            else {
                group.rows.push(row);
            }
        }
        console.log(result.length);
        return result;
    }


    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getRegisteredRidesForPatient(patientId: string, context?: Context) {
        let result: rides4PatientRow[] = [];

        let today = await Utils.getServerDate();
        // let tomorrow = addDays(1);
        let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        // let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

        for await (const ride of context.for(Ride).iterate({
            where: r => (r.date.isGreaterOrEqualTo(todayDate))
                .and(r.patientId.isEqualTo(patientId)),
            orderBy: r => [{ column: r.date, descending: false }],
        })) {

            // Build Row
            // let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

            // let date = rDate.getTime() === todayDate.getTime()
            //     ? "Today"
            //     : rDate.getTime() === tomorrowDate.getTime()
            //         ? "Tomorrow"
            //         : formatDate(rDate.getTime(), "dd/MM/yyyy", 'en-US');//todo:'he-IL';
            // let period = ride.dayPeriod.value.id;
            // let title = `${date} - ${period}`;

            let icons: { name: string, desc: string }[] = [];
            if (ride.isHasBabyChair.value) {
                icons.push({ name: "child_friendly", desc: "Has Babychair" });
            }
            if (ride.isHasWheelchair.value) {
                icons.push({ name: "accessible", desc: "Has Wheelchair" });
            }
            if (ride.isHasExtraEquipment.value) {
                icons.push({ name: "home_repair_service", desc: "Has Extra Equipment" });
            }

            let phones = "";
            let p = await context.for(Patient).findId(ride.patientId.value);
            if (p && p.mobile && p.mobile.value) {
                phones = p.mobile.value;
            }

            let row: rides4PatientRow = {
                id: ride.id.value,
                date: ride.date.value,
                status: ride.status.value,
                statusDate: ride.statusDate.value,
                from: (await context.for(Location).findId(ride.fromLocation.value)).name.value,
                to: (await context.for(Location).findId(ride.toLocation.value)).name.value,
                passengers: ride.passengers(),
                phones: phones,
                isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
                isWaitingForStart: ride.isWaitingForStart(),
                isWaitingForPickup: ride.isWaitingForPickup(),
                isWaitingForArrived: ride.isWaitingForArrived(),
            };
            result.push(row);
        }
        return result;
    }


    @ServerFunction({ allowed: Roles.driver })
    static async getRegisteredRidesForDriver(driverId: string, context?: Context) {
        let result: rides4DriverRow[] = [];

        for await (const grp of await this.getRegisteredRidesForDriverGoupByDateAndPeriod(driverId, false, context)) {
            result.push(...grp.rows);
        }
        return result;
    }

    @ServerFunction({ allowed: Roles.driver })
    static async getRegisteredRidesForDriverGoupByDateAndPeriod(driverId: string, groupByFromAndTo = false, context?: Context) {
        let result: rides4Driver[] = [];

        let today = await Utils.getServerDate();
        let tomorrow = addDays(1);
        // let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        // let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00
        let todayDate = Usher.fromDemoTodayMidnight;
        let tomorrowDate = Usher.toDemoTodayMidnight;

        for await (const ride of context.for(Ride).iterate({
            where: r => (r.date.isGreaterOrEqualTo(todayDate))
                .and(r.status.isNotIn(...[RideStatus.waitingForDriver, RideStatus.succeeded]))
                .and(r.driverId.isEqualTo(driverId)),
            orderBy: r => [{ column: r.date, descending: false }],
        })) {

            // Build Row
            let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

            let date = rDate.getTime() === todayDate.getTime()
                ? "Today"
                : rDate.getTime() === tomorrowDate.getTime()
                    ? "Tomorrow"
                    : formatDate(rDate.getTime(), "dd/MM/yyyy", 'en-US');//todo:'he-IL';
            let period = ride.dayPeriod.value.id;
            let title = `${date} - ${period}`;

            let icons: { name: string, desc: string }[] = [];
            if (ride.isHasBabyChair.value) {
                icons.push({ name: "child_friendly", desc: "Has Babychair" });
            }
            if (ride.isHasWheelchair.value) {
                icons.push({ name: "accessible", desc: "Has Wheelchair" });
            }
            if (ride.isHasExtraEquipment.value) {
                icons.push({ name: "home_repair_service", desc: "Has Extra Equipment" });
            }

            let phones = "";
            let p = await context.for(Patient).findId(ride.patientId.value);
            if (p && p.mobile && p.mobile.value) {
                phones = p.mobile.value;
            }

            let row: rides4DriverRow = {
                id: ride.id.value,
                from: (await context.for(Location).findId(ride.fromLocation.value)).name.value,
                to: (await context.for(Location).findId(ride.toLocation.value)).name.value,
                passengers: ride.passengers(),
                icons: icons,
                phones: phones,
                date: ride.date.value,
                ids: [],
                groupByLocation: false,
                isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
                isWaitingForStart: ride.isWaitingForStart(),
                isWaitingForPickup: ride.isWaitingForPickup(),
                isWaitingForArrived: ride.isWaitingForArrived(),
            };

            let group = result.find(grp => grp.title === title);
            if (!(group)) {
                group = { title: title, rows: [] };
                result.push(group);
            }

            if (groupByFromAndTo) {
                let key = `${row.from}-${row.to}`;
                let r = group.rows.find(r => key === `${r.from}-${r.to}`);
                if (r) {
                    r.ids.push(row.id);
                    r.passengers += row.passengers;
                }
                else {
                    r = row;
                    r.ids.push(row.id);
                    r.groupByLocation = true;
                    r.icons = [];
                    group.rows.push(r);
                }
            }
            else {
                group.rows.push(row);
            }
        }
        return result;
    }

    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getSuggestedDriversForRide(rideId: string, context?: Context) {
        let result: drivers4UsherRow[] = [];

        let ride = await context.for(Ride).findId(rideId);

        let today = await Utils.getServerDate();
        let tomorrow = addDays(1);
        let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

        let driversIds: string[] = [];
        for await (const pf of context.for(DriverPrefs).iterate({
            where: pf => (pf.locationId.isEqualTo(ride.fromLocation).or(pf.locationId.isEqualTo(ride.toLocation))),
        })) {
            driversIds.push(pf.driverId.value);
        };

        if (driversIds.length > 0) {

            for await (const d of context.for(Driver).iterate({
                where: d => d.id.isIn(...driversIds),
            })) {


                let last = await context.for(Ride).findFirst({
                    where: r => r.driverId.isEqualTo(d.id),
                    orderBy: r => [{ column: r.date, descending: true }]
                });
                let days = 0;
                if (last) {

                    let now = new Date();//now
                    let rDate = last.date.value;
                    let diff = +now - +rDate;
                    days = (-1 * (Math.ceil(diff / 1000 / 60 / 60 / 24) + 1));
                }

                let row: drivers4UsherRow = {
                    id: d.id.value,
                    name: d.name.value,
                    mobile: d.mobile.value,
                    days: days,
                    lastStatus: d.lastStatus.value,
                    lastStatusDate: d.lastStatusDate.value,
                    isWaitingForUsherApproove: d.isWaitingForUsherApproove(),
                    isWaitingForStart: d.isWaitingForStart(),
                    isWaitingForPickup: d.isWaitingForPickup(),
                    isWaitingForArrived: d.isWaitingForArrived(),
                };
                result.push(row);
            }
        }
        return result;
    }

    @ServerFunction({ allowed: Roles.driver })
    static async getSuggestedPatientsForRide(patientId: string, groupByFromAndTo = false, context?: Context): Promise<rides4PatientRow[]> {
        let result: rides4PatientRow[] = [];
        return result;
    }

    @ServerFunction({ allowed: Roles.driver })
    static async getSuggestedRidesForDriverGoupByDateAndPeriod(driverId: string, groupByFromAndTo = false, context?: Context): Promise<rides4Driver[]> {
        let result: rides4Driver[] = [];

        let today = await Utils.getServerDate();
        let tomorrow = addDays(1);
        let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

        let fromBorders: string[] = [];
        let toBorders: string[] = [];
        for await (const pf of context.for(DriverPrefs).iterate({
            where: pf => pf.driverId.isEqualTo(driverId),
        })) {
            fromBorders.push(pf.locationId.value);
            if (pf.isAlsoBack.value) {
                toBorders.push(pf.locationId.value);
            }
        };

        if (fromBorders.length > 0) {

            for await (const ride of context.for(Ride).iterate({
                where: r => (r.date.isGreaterOrEqualTo(todayDate))//dates
                    .and(r.status.isEqualTo(RideStatus.waitingForDriver))//status
                    .and(r.fromLocation.isIn(...fromBorders).or(r.toLocation.isIn(...toBorders))),//locations
            })) {

                // Build Row
                let rDate = new Date(ride.date.value.getFullYear(), ride.date.value.getMonth(), ride.date.value.getDate());

                let date = rDate.getTime() === todayDate.getTime()
                    ? "Today"
                    : rDate.getTime() === tomorrowDate.getTime()
                        ? "Tomorrow"
                        : formatDate(rDate.getTime(), "dd/MM/yyyy", 'en-US');//todo:'he-IL'
                let period = ride.dayPeriod.value.id;
                let title = `${date} - ${period}`;

                let icons: { name: string, desc: string }[] = [];
                if (ride.isHasBabyChair.value) {
                    icons.push({ name: "child_friendly", desc: "Has Babychair" });
                }
                if (ride.isHasWheelchair.value) {
                    icons.push({ name: "accessible", desc: "Has Wheelchair" });
                }
                if (ride.isHasExtraEquipment.value) {
                    icons.push({ name: "home_repair_service", desc: "Has Extra Equipment" });
                }

                let row: rides4DriverRow = {
                    id: ride.id.value,
                    from: (await context.for(Location).findId(ride.fromLocation.value)).name.value,
                    to: (await context.for(Location).findId(ride.toLocation.value)).name.value,
                    passengers: ride.passengers(),
                    icons: icons,
                    phones: "",
                    groupByLocation: false,
                    ids: [],
                    date: ride.date.value,
                    isWaitingForUsherApproove: ride.isWaitingForUsherApproove(),
                    isWaitingForStart: ride.isWaitingForStart(),
                    isWaitingForPickup: ride.isWaitingForPickup(),
                    isWaitingForArrived: ride.isWaitingForArrived(),
                };

                let group = result.find(grp => grp.title === title);
                if (!(group)) {
                    group = { title: title, rows: [] };
                    result.push(group);
                }

                if (groupByFromAndTo) {
                    let key = `${row.from}-${row.to}`;
                    let r = group.rows.find(r => key === `${r.from}-${r.to}`);
                    if (r) {
                        r.ids.push(row.id);
                        r.passengers += row.passengers;
                    }
                    else {
                        r = row;
                        r.ids.push(row.id);
                        r.groupByLocation = true;
                        r.icons = [];
                        group.rows.push(r);
                    }
                }
                else {
                    group.rows.push(row);
                }

            }
        }

        return result;
    }

    @ServerFunction({ allowed: [Roles.driver, Roles.usher, Roles.admin] })
    static async getSuggestedRidesForDriver(driverId: string, context?: Context): Promise<rides4DriverRow[]> {
        let result: rides4DriverRow[] = [];

        for await (const grp of await Usher.getSuggestedRidesForDriverGoupByDateAndPeriod(driverId, false, context)) {
            result.push(...grp.rows);
        }

        return result;
    }
}

export function addDays(days: number) {
    var x = new Date();
    x.setDate(x.getDate() + days);
    return x;
}


export class ByDate {
    static yesterday = new ByDate(d => d.isEqualTo(addDays(-1)));
    static today = new ByDate(d => d.isEqualTo(new Date()));
    static tomorrow = new ByDate(d => d.isEqualTo(addDays(1)));
    static todayAndAbove = new ByDate(d => d.isGreaterOrEqualTo(new Date()));
    static yesterdayAndBelow = new ByDate(d => d.isLessThan(new Date()));
    static all = new ByDate(d => new Filter(x => { }));
    constructor(public filter: (date: DateColumn) => Filter) { }
    id;
}

export class ByDateColumn extends ValueListColumn<ByDate>{
    constructor(options?: ColumnSettings<ByDate>) {
        super(ByDate, {
            defaultValue: ByDate.today,
            ...options
        });
    }
}

export interface rides4PatientRow {
    id: string,
    date: Date,
    from: string,
    to: string,
    passengers: number,
    phones: string,
    status: RideStatus,
    statusDate: Date,
    isWaitingForUsherApproove: boolean,
    isWaitingForStart: boolean,
    isWaitingForPickup: boolean,
    isWaitingForArrived: boolean,

    // status: string, 
    // status: (id: string) => void,
};

export interface drivers4UsherRow {
    id: string,
    name: string,
    mobile: string,
    days: number,

    lastStatus: RideStatus,
    lastStatusDate: Date,
    isWaitingForUsherApproove: boolean,
    isWaitingForStart: boolean,
    isWaitingForPickup: boolean,
    isWaitingForArrived: boolean,
};

export interface rides4DriverRow {
    id: string,
    from: string,
    to: string,
    passengers: number,
    icons: { name: string, desc: string }[],
    phones: string,
    date: Date,
    groupByLocation: boolean,
    ids: string[],

    isWaitingForUsherApproove: boolean,
    isWaitingForStart: boolean,
    isWaitingForPickup: boolean,
    isWaitingForArrived: boolean,

    // info:()=>string,
    // status: string, 
    // status: (id: string) => void,
};

export interface rides4DriverGroup {
    title: string,
    rows: rides4DriverRow[],
    groups: rides4DriverGroup[],
};
export interface rides4Driver {
    title: string,
    rows: rides4DriverRow[],
};
export interface ridesNoPatient {
    title: string,
    rows: rides4Usher[],
};

export interface rides4Usher {

    id: string,
    date: Date,
    from: string,
    to: string,
    patinetName: string,
    patinetAge: number,
    passengers: number,
    patientMobile: string,
    driverName: string,
    status: string,
    statusDate: Date,
    icons: { name: string, desc: string }[],
    groupByLocation: boolean,
    ids: string[],
}
export interface ridesWaiting4Driver {
    title: string,
    rows: rides4Usher[],
};
