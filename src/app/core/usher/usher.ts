import { ColumnSettings, Context, ServerFunction, ValueListColumn } from "@remult/core";
import { DayPeriod } from "../drivers/driverPrefSchedule";
import { Ride, RideStatus } from "../rides/ride";
import { ByDate, ByDateColumn } from "./ByDate";

export class Usher {

   

    // assign driver to ride by his prefs(location&dayOfWeek&dayPeriod)
    @ServerFunction({ allowed: c => c.isSignedIn() })//allowed: Roles.matcher
    static async organize(byDate?: ByDate, context?: Context) {
        let assignsCount = 0;
        byDate = new ByDateColumn().info.byId(byDate.id);

        var relevents: {
            rideId: String,
            locationFromId: String,
            locationToId?: String,//catch the driver when returns back. to bring back OTHER patient for him.
            dayOfWeek?: Date,
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

       
        for await (const r of  context.for(Ride).iterate({
            // limit: 1000,
            orderBy: r => [{ column: r.date }],
            where: r => [this.filter(r, byDate)],
        })) {
            relevents.push({
                drivers:[],
                locationFromId:r.from.value,
                rideId:r.id.value,
                containsLocation:l=>r.from.value ==l || r.to.value==l
            });
        }
        

       





            // relevents.push({
            //     containsLocation: id => 
            //         r.from.isEqualTo(id)
            //             .or(r.from.isEqualTo(id))
                
            // }
            // );

        // // maybe for check isActive
        // // drivers.forEach(d=>{
        // //     if(relevents.find(r => d.location.isEquals( r.locationFromId))){
        // //         r.drivers.push({
        // //             driverId: d.id.value,
        // //             prefs = [];
        // //         });
        // //     }
        // // });

        // driverPrefs.forEach(prf => {
        //     if (relevents.find(r => prf.location.isEquals(r.locationFromId))) {
        //         //todo: apply priority of drivers to location by actual last rides
        //         r.drivers.push({
        //             driverId: prf.driverId.value,
        //             prefs =[].push({
        //                 prefId = prf.id.value,
        //                 status: byRequestedPref,
        //             });
        //         });
        //     }

        //     if (relevents.find(r => prf.location.isEquals(r.locationToId))) {
        //         r.drivers.push/*if not exists = one match is fine*/({
        //             driverId: prf.driverId.value,
        //             prefs =[].push({
        //                 prefId = prf.id.value,
        //                 status: maybeGetPatientBack,
        //             });
        //         });
        //     }
        // });

        // driverPrefsSchedules.forEach(scdl => {
        //     if (relevents.find(r => prfscdl.weekOfDay.isEquals(r.dayOfWeek)))
        //     {
        //         dayPeriod = r.dayPeriod;
        //         // if try catch driver when return, but he ride is afternoon
        //         if(r.drivers.prefs[scdl.prefId].status == maybeGetPatientBack){
        //             if(r.dayPeriod == DayPeriod.afternoon){
        //                 r.drivers[id].prefs[pid].status = notRelevent;
        //             }
        //         }
        //         else{
        //             r.drivers[id].prefs[pid].status = canGetPatientBack;
        //         }
        //     }


        //     if (!(relevents.find(r => prfscdl.dayPeriod.isEquals(r.dayPeriod))))
        //     {
        //         r.drivers[id].prefs[pid].status = notRelevent;
        //     }
        // });

        // //REady no more db
        // relevents.forEach(r => 
        //     r.drivers.forEach(d => {
        //         d.prefs.forEach( p=>{
        //             if(p.status == ){
        //                 let ride = rides.find((rec) => rec.id.isEqualTo(r.id));
        //                 if(ride){
        //                     if(ride.driverId == undefined){
        //                         ride.driverId.value = d.driverId;
        //                         ride.driverPrefId.value = p.prefId;
        //                         // ride.driverPrefScdlId.value = s.id;
        //                         ride.matchDate = new Date();
        //                         ride.save();
        //                         ++assignsCount;
        //                     }
        //                 }
        //             }
        //         })
        //     }))

        /*


    getDrivers((d) => d.location.isequals(relevent.locationFromId)){
        relevents.push(
            dri
            drivers.push(
                d.id.value,
                RideStatus.waitingFor3Match),
        );
    }

    getDriversPrefs((prf) => prf.location.isequals(relevent.locationFromId)){
        relevents.push(
            drivers.push(d.id.value, RideStatus.waitingForDriverAccept);
        );
    }

    // collect relevent locations to&from
    // let locationIds: string[] = [];
    rides.forEach(r => {

        //or(filter: Filter): Filter;

        relevents.push({
            rideId: r.id.value,
            locationFromId: r.from.value,
            locationToId: r.to.value,
            // containsLocation:id => [
            //     r.from.isEqualTo(id)
            //         .or(r.from.isEqualTo(id))
            // ]
        });

        // if (!(locationIds.includes(r.from.value))) {
        //     locationIds.push(r.from.value);
        // }
        // if (!(locationIds.includes(r.to.value))) {
        //     locationIds.push(r.to.value);
        // }
    });

    relevents.forEach(r => {

        if (r.containsLocation()) {

        }
    });

    // collect relevent driver pickup-locations
    let driverPrefIds: string[] = [];
    for await (let pref of context.for(DriverPrefs).iterate()) {

        if (locationIds.includes(pref.locationId.value)) {
            driverPrefIds.push(pref.id.value);
            relevents.push({
                rideId: 
            });
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
            ++assignsCount;
            //     }
            // }
        }
    };


    // rides.map(r => {
    //     return {
    //         location: r.from.value,
    //     } as Location;

    // }) as Location[];
*/
        return assignsCount;
    }

    // Filter by status&driver&date
    static filter(ride: Ride, orgBy?: ByDate) {

        const today = new Date();
        const yesterday = new Date(today.getDate() - 1);
        const tomorrow = new Date(today.getDate() + 1);

        // waitingForMatch&no-driver-yet
        var filter = ride.status.isEqualTo(RideStatus.waitingFor3Match)
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
