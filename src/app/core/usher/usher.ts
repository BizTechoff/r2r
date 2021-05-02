import { formatDate } from "@angular/common";
import { ColumnSettings, Context, DateColumn, Filter, Role, ServerFunction, ValueListColumn } from "@remult/core";
import { Utils } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { Driver } from "../drivers/driver";
import { DriverPrefs } from "../drivers/driverPrefs";
import { Patient } from "../patients/patient";
import { Ride, RideStatus } from "../rides/ride";
import { Location } from "./../locations/location";

export class Usher {



    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getWaitingRides4Driver(context?: Context, groupByFromAndTo = false): Promise<ridesWaiting4Driver[]> {
        let result: ridesWaiting4Driver[] = [];

        let today = await Utils.getServerDate();
        let tomorrow = addDays(1);
        let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

        for await (const ride of context.for(Ride).iterate({
            where: r => (r.date.isGreaterOrEqualTo(todayDate))
                .and(r.status.isEqualTo(RideStatus.waitingForDriverAccept)),
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
                driverName: ride.exsistDriver()? (await context.for(Driver).findId(ride.driverId.value)).name.value:"",
                id: ride.id.value,
                date: ride.date.value,
                status: ride.status.value.id,
                statusDate: ride.statusDate.value,
                from: (await context.for(Location).findId(ride.from.value)).name.value,
                to: (await context.for(Location).findId(ride.to.value)).name.value,
                passengers: ride.passengers(),
            };

            if (groupByFromAndTo) {
                let key = `${ride.from}-${row.to}`;
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
                driverName: ride.exsistDriver() ? (await context.for(Driver).findId(ride.driverId.value)).name.value : "",
                id: ride.id.value,
                date: ride.date.value,
                status: ride.status.value.id,
                statusDate: ride.statusDate.value,
                from: (await context.for(Location).findId(ride.from.value)).name.value,
                to: (await context.for(Location).findId(ride.to.value)).name.value,
                passengers: ride.passengers(),
            };

            if (groupByFromAndTo) {
                let key = `${ride.from}-${row.to}`;
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
                from: (await context.for(Location).findId(ride.from.value)).name.value,
                to: (await context.for(Location).findId(ride.to.value)).name.value,
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
        let todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());//T00:00:00
        let tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());//T00:00:00

        for await (const ride of context.for(Ride).iterate({
            where: r => (r.date.isGreaterOrEqualTo(todayDate))
                .and(r.status.isDifferentFrom(RideStatus.waitingForDriverAccept))
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
                from: (await context.for(Location).findId(ride.from.value)).name.value,
                to: (await context.for(Location).findId(ride.to.value)).name.value,
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
            where: pf => (pf.locationId.isEqualTo(ride.from).or(pf.locationId.isEqualTo(ride.to))),
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
                    .and(r.status.isEqualTo(RideStatus.waitingForDriverAccept))//status
                    .and(r.from.isIn(...fromBorders).or(r.to.isIn(...toBorders))),//locations
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
                    from: (await context.for(Location).findId(ride.from.value)).name.value,
                    to: (await context.for(Location).findId(ride.to.value)).name.value,
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
