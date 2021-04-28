import { ColumnSettings, Context, Filter, ServerFunction, ValueListColumn } from "@remult/core";
import { Driver } from "../drivers/driver";
import { DayOfWeek, DayPeriod, DriverPrefs } from "../drivers/driverPrefs";
import { Ride, RideStatus } from "../rides/ride";
import { ByDate } from "./ByDate";

export class Usher {


    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getReleventRidesForDriver(driverId: string, context?: Context) {//, isOnlyNoDriver = false
        let result: string[] = [];

        let prefs = await context.for(DriverPrefs).find({
            where: rf => rf.driverId.isEqualTo(driverId)
        });

        let empty = [undefined];
        for (const p of prefs) {
            let rides = await context.for(Ride).find({
                where: r =>
                    (r.dayOfWeek.isEqualTo(p.dayOfWeek))
                        .and((r.dayPeriod.isEqualTo(p.dayPeriod)))
                // .and(isOnlyNoDriver? r.driverId == undefined || r.driverId.value == undefined:true)
                // && (r.driverId),
                // && (p.locationId && p.locationId.value && p.locationId.value.length > 0
                //     ? r.from.isEqualTo(p.locationId)
                //     : r.id.isEqualTo(r.id))//should be always true

            });
            if (rides && rides.length > 0) {
                rides.forEach(r => {
                    //if (!(r.driverId && r.driverId.value && r.driverId.value.length > 0)) {
                    if (!(result.includes(r.id.value))) {
                        result.push(r.id.value);
                    }
                    //}
                });
            }
        }


        return result;
    }


    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async getReleventDriversForRide(rideId: string, context?: Context) {
        let result: { id: string, caption: string, days: number }[] = [];

        // get ride details.
        let ride = await context.for(Ride).findId(rideId);
        if (ride && ride.id.value && ride.id.value.length > 0) {        // let empty = [undefined];

            // get relevent prefs.
            let driversPrefs = await context.for(DriverPrefs).find({
                where: pf =>
                    (pf.dayOfWeek.isEqualTo(ride.dayOfWeek))
                        .and((pf.dayPeriod.isEqualTo(ride.dayPeriod)))
            });

            // get last ride for driver(s).
            if (driversPrefs && driversPrefs.length > 0) {
                let driversIds: string[] = [];//keep uniqe (not duplicate)
                for (const pf of driversPrefs) {
                    // console.log(driversIds.length);
                    if (!(driversIds.includes(pf.driverId.value))) {
                        //if (!(pf.driverId.isIn(...driversIds))) {
                        // console.log(pf.id)
                        driversIds.push(pf.driverId.value);

                        let last = await context.for(Ride).findFirst({
                            where: r => r.driverId.isEqualTo(pf.driverId),
                            orderBy: r => [{ column: r.date, descending: true }]
                        });
                        let days = 0;
                        if (last) {

                            let now = new Date();//now
                            let rDate = last.date.value;
                            let diff = +now - +rDate;
                            days = (-1 * (Math.ceil(diff / 1000 / 60 / 60 / 24) + 1));
                        }

                        // get driver details (name&mobile)
                        let d = await context.for(Driver).findId(pf.driverId.value);
                        let caption = `${d.name.value} | ${d.mobile.value} | ${days}`;

                        result.push({
                            id: d.id.value,
                            caption: caption,
                            days: days,
                        })

                        result.sort((a, b) => a.days - b.days);
                    }
                }
            }
        }
        return result;
    }

    // assign driver to ride by his prefs(location&dayOfWeek&dayPeriod)
    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async organize(byDate?: ByDate, context?: Context) {
        let assignsCount = 0;
        byDate = new ByDateColumn().info.byId(byDate.id);

        var relevents: {
            rideId: String,
            locationFromId: String,
            locationToId?: String,//catch the driver when returns back. to bring back OTHER patient for him.
            dayOfWeek?: DayOfWeek,
            dayPeriod?: DayPeriod,
            containsLocation?: (id) => boolean,
            drivers: {//the matching drivers for ride
                driverId: String,
                prefs: {//the matching prefs for driver-ride
                    prefId: String,
                    status: RideStatus,
                }[],
            }[],
        }[];// = [];


        for await (const r of context.for(Ride).iterate({
            // limit: 1000,
            orderBy: r => [{ column: r.date }],
            where: r => [this.filter(r, byDate)],
        })) {
            relevents.push({
                drivers: [],
                locationFromId: r.from.value,
                rideId: r.id.value,
                containsLocation: l => r.from.value == l || r.to.value == l
            });
        }
        return assignsCount;
    }

    // Filter by status&driver&date
    private static filter(ride: Ride, orgBy?: ByDate) {

        const today = new Date();
        const yesterday = new Date(today.getDate() - 1);
        const tomorrow = new Date(today.getDate() + 1);

        // waitingForMatch&no-driver-yet
        var filter = ride.status.isEqualTo(RideStatus.waitingFor10DriverAccept)
            .and(ride.driverId.isEqualTo(undefined));

        switch (orgBy) {
            case ByDate.all: {
                break;
            }
            case ByDate.todayAndAbove: {
                filter = filter.and(ride.date.isGreaterOrEqualTo(today));
                break;
            }
            case ByDate.yesterdayAndBelow: {
                filter = filter.and(ride.date.isLessThan(today));
                break;
            }
            case ByDate.yesterday: {
                filter = filter.and(ride.date.isEqualTo(yesterday));
                break;
            }
            case ByDate.tomorrow: {
                filter = filter.and(ride.date.isEqualTo(tomorrow));
                break;
            }
            default: {// OrganizeWhereCaulse.today:
                filter = filter.and(ride.date.isEqualTo(today));
                break;
            }
        }

        return filter;
    }

}

function getDayOfWeek(desc: string) {
    switch (desc) {
        case "ראשון":
        case "1":
            return DayOfWeek.sunday;
        case "שני":
        case "2":
            return DayOfWeek.monday;
        case "שלישי":
        case "3":
            return DayOfWeek.tuesday;
        case "רביעי":
        case "4":
            return DayOfWeek.wednesday;
        case "חמישי":
        case "5":
            return DayOfWeek.thursday;
        case "שישי":
        case "6":
            return DayOfWeek.friday;
        case "שבת":
        case "7":
            return DayOfWeek.saturday;

        default:
            break;
    }
}

function getDayPeriod(dayNum: number) {
    switch (dayNum) {
        case 1: return DayOfWeek.sunday;
        case 2: return DayOfWeek.monday;
        case 3: return DayOfWeek.tuesday;
        case 4: return DayOfWeek.wednesday;
        case 5: return DayOfWeek.thursday;
        case 6: return DayOfWeek.friday;
        case 7: return DayOfWeek.saturday;

        default:
            break;
    }
}

export class DriverRelevntBy {
    static dayAndPeriod = new DriverRelevntBy(r => r.dayOfWeek.isEqualTo(r.dayOfWeek).and(r.dayPeriod.isEqualTo(r.dayPeriod)));
    static noDriverId = new DriverRelevntBy(r => r.driverId.isEqualTo(undefined).or(r.driverId.isDifferentFrom('')));
    static all = DriverRelevntBy.dayAndPeriod && DriverRelevntBy.noDriverId;
    constructor(public filter: (ride: Ride) => Filter) { }
    id;
}

export function addDays(days: number) {
    var x = new Date();
    x.setDate(x.getDate() + days);
    return x;
}
export class ByDateColumn extends ValueListColumn<ByDate>{
    constructor(options?: ColumnSettings<ByDate>) {
        super(ByDate, {
            defaultValue: ByDate.today,
            ...options
        });
    }
}
