import { Context, ServerFunction, ValueListColumn } from "@remult/core";
import { Driver } from "../drivers/driver";
import { DriverPrefs } from "../drivers/driverPrefs";
import { DriverPrefsSchedule } from "../drivers/driverPrefSchedule";
import { Location } from "../locations/location";
import { Ride, RideStatus } from "../rides/ride";

export class Usher {

    // Should execute only by usher, AdminGuard

    async organize(byDate?: ByDate, context?: Context) {
        await Usher.organize(byDate, context);
    }

    // assign driver to ride by his prefs(location&dayOfWeek&dayPeriod)
    @ServerFunction({ allowed: c => c.isSignedIn() })
    static async organize(byDate?: ByDate, context?: Context) {

        let rides = await context.for(Ride).find({
            // limit: 1000,
            orderBy: r => [{ column: r.date }],
            where: r => [this.filter(r, byDate)],
        });

        // collect relevent locations to&from
        let locationIds: string[] = [];
        rides.forEach(r => {
            locationIds.push(r.from.value);
            locationIds.push(r.to.value);
        });

        // collect relevent driver pickup-locations
        let driverPrefIds: string[] = [];
        for await (let pref of context.for(DriverPrefs).iterate()) {
            if (locationIds.includes(pref.locationId.value)) {
                driverPrefIds.push(pref.id.value);
            }
        };
        
        // collect relevent schedule's drivers
        let schedules: string[] = [];
        for await (let sched of context.for(DriverPrefsSchedule).iterate()) {
            if (driverPrefIds.includes(sched.driverPrefsId.value)) {
                // if (sched.dayPeriod.isEqualTo(ride.dayPeriod)) {
                //     if (sched.dayOfWeek.value.id == getDayOfWeek(ride.date)) {
                //         // schedules.push(sched.driverId.value);
                //         rides.driverId.value = driverPrefIds[0].driverId;
                //         driverPrefIds.pop(sched.driverPrefsId.value);
                //     }
                // }
            }
        };


        // rides.map(r => {
        //     return {
        //         location: r.from.value,
        //     } as Location;

        // }) as Location[];
    }

    // Filter by status&driver&date
    static filter(ride: Ride, orgBy?: ByDate) {

        const today = new Date();
        const yesterday = new Date(today.getDate() - 1);
        const tomorrow = new Date(today.getDate() + 1);

        // waitingForMatch&no-driver-yet
        var filter = ride.status.isEqualTo(RideStatus.waitingForMatch)
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

export class ByDate {
    static yesterday = new RideStatus(1, 'yesterday',);
    static today = new RideStatus(2, 'today',);
    static tomorrow = new RideStatus(3, 'tomorrow',);
    static todayAndAbove = new RideStatus(4, 'todayAndAbove',);
    static yesterdayAndBelow = new RideStatus(5, 'yesterdayAndBelow',);
    static all = new RideStatus(6, 'all',);
    constructor(public id: number, public caption: string, public color = 'green') { }
}

export class ByDateColumn extends ValueListColumn<ByDate>{
  constructor() {
    super(ByDate);
  }
}
