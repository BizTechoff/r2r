import { BoolColumn, ColumnSettings, Context, DateColumn, EntityClass, IdEntity, NumberColumn, ServerFunction, StringColumn, ValueListColumn } from "@remult/core";
import { ServerEventsService } from "../../server/server-events-service";
import { Utils } from "../../shared/utils";
import { Driver, DriverIdColumn } from "../drivers/driver";
import { DriverRidesComponent } from "../drivers/driver-rides/driver-rides.component";
import { DayOfWeekColumn, DayPeriodColumn, DriverPrefs } from "../drivers/driverPrefs";
import { LocationIdColumn } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";
import { addDays } from "../usher/ByDate";

@EntityClass
export class Ride extends IdEntity {

    driverId = new DriverIdColumn(this.context, "Driver", "driverId");
    patientId = new PatientIdColumn(this.context, "Patient", "patientId");
    status = new RideStatusColumn();
    statusDate = new DateColumn();
    importRideNum = new StringColumn();

    from = new LocationIdColumn(this.context, "From", 'from_');
    to = new LocationIdColumn(this.context, "To", 'to_');
    date = new DateColumn({
        // valueChange: () => {this.dayOfWeek.value = Utils.getDayOfWeek(this.date.getDayOfWeek())},

    });
    dayPeriod = new DayPeriodColumn();
    dayOfWeek = new DayOfWeekColumn({
        // return Utils.getDayOfWeek(this.date.getDayOfWeek());
    });

    assignDate = new DateColumn({});
    isNeedBabyChair = new BoolColumn({ caption: 'Need Baby Chair' });
    isNeedWheelchair = new BoolColumn({ caption: 'Need Wheel Chair' });
    isHasExtraEquipment = new BoolColumn({ caption: 'Has Extra Equipment' });

    isHasEscort = new BoolColumn({ caption: 'Has Escort', defaultValue: false });
    escortsCount = new NumberColumn({});

    constructor(private context: Context) {
        super({
            name: "rides",
            allowApiCRUD: c => c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),
            saved: () => {
                if (context.onServer) {//trigger db
                    if (this.status.wasChanged()) {
                        ServerEventsService.OnServerSendMessageToChannel(this.driverId.value, { text: 'The message text' });
                    }
                }
            }


        });
    }

    getDayOfWeek() {
        return DriverPrefs.getDayOfWeek(this.date.getDayOfWeek());
    }


    isWaitingForDriverAccept() {
        return this.status.value === RideStatus.waitingFor10DriverAccept;
    }

    isWaitingForUsherApproove() {
        return this.status.value === RideStatus.waitingFor20UsherApproove;
    }

    isWaitingForStart() {
        return this.status.value === RideStatus.waitingFor30Start;
    }

    isWaitingForPickup() {
        return this.status.value === RideStatus.waitingFor40Pickup;
    }

    isWaitingForArrived() {
        return this.status.value === RideStatus.waitingFor50Arrived;
    }


    copyTo(target: Ride) {
        target.from.value = this.from.value;
        target.to.value = this.to.value;
        target.dayPeriod.value = this.dayPeriod.value;
        target.date.value = this.date.value;
        target.isNeedWheelchair.value = this.isNeedWheelchair.value;
        target.isHasEscort.value = this.isHasEscort.value;
        target.escortsCount.value = this.escortsCount.value;
        target.patientId.value = this.patientId.value;
        target.driverId.value = this.driverId.value;
        target.status = this.status;
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
                    lastStatus: d.lastStatus.value ? d.lastStatus.value.caption : "",
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
}

export class RideStatus {
    static waitingFor10DriverAccept = new RideStatus(10, 'waitingForDriverAccept',);
    //static waitingFor12Patient = new RideStatus(2, 'waitingForPatient',);//driver future ride
    //static waitingFor18Match = new RideStatus(3, 'waitingForMatch',);
    static waitingFor20UsherApproove = new RideStatus(20, 'waitingForUsherApproove',);
    static waitingFor30Start = new RideStatus(30, 'waitingForStart',);
    static waitingFor40Pickup = new RideStatus(40, 'waitingForPickup',);
    static waitingFor50Arrived = new RideStatus(50, 'waitingForArrived',);
    static waitingFor60End = new RideStatus(60, 'waitingForEnd',);
    static succeeded = new RideStatus(100, 'succeeded',);
    static failed = new RideStatus(101, 'failed',);
    static rejected = new RideStatus(102, 'rejected',);
    constructor(public id: number, public caption: string, public color = 'green') { }
    // static isWaitingForUsherApproove(){return this.waitingFor20UsherApproove;}
}

//חולה ונהג יכולים להיות ריקים
export class RideStatusColumn extends ValueListColumn<RideStatus>{
    constructor(options?: ColumnSettings<RideStatus>) {
        super(RideStatus, {
            defaultValue: RideStatus.waitingFor10DriverAccept,
            ...options
        });
    }
}


export interface drivers4UsherRow {
    id: string,
    name: string,
    mobile: string,
    days: number,

    lastStatus: string,
    lastStatusDate: Date,
    isWaitingForUsherApproove: boolean,
    isWaitingForStart: boolean,
    isWaitingForPickup: boolean,
    isWaitingForArrived: boolean,
};
