import { BoolColumn, Context, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";

@EntityClass
export class DriverPrefsSchedule extends IdEntity {

    driverPrefsId = new StringColumn({});//fk
    dayOfWeek = new DayOfWeekColumn();
    dayPeriod = new DayPeriodColumn();
    isEveryWeek = new BoolColumn({});

    constructor(private context: Context) {
        super({
            name: "driversPrefsSchedules",
            allowApiCRUD: c => c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),
        });
    }
}

export class DayPeriod {
    static morning = new DayPeriod(1, 'morning',);
    static afternoon = new DayPeriod(2, 'afternoon', 'red');
    constructor(public id: number, public caption: string, public color = 'green') { }
}

export class DayPeriodColumn extends ValueListColumn<DayPeriod>{
    constructor() {
        super(DayPeriod);
    }
}


export class DayOfWeek {
    static sunday = new DayOfWeek(1, 'sunday',);
    static monday = new DayOfWeek(2, 'monday',);
    static tuesday = new DayOfWeek(3, 'tuesday',);
    static wednesday = new DayOfWeek(4, 'wednesday',);
    static thursday = new DayOfWeek(5, 'thursday',);
    static friday = new DayOfWeek(6, 'friday',);
    static saturday = new DayOfWeek(7, 'saturday',);
    constructor(public id: number, public caption: string, public color = 'green') { }
}

export class DayOfWeekColumn extends ValueListColumn<DayOfWeek>{
    constructor() {
        super(DayOfWeek);
    }
}


