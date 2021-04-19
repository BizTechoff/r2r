import { BoolColumn, ColumnSettings, Context, EntityClass, IdEntity, NumberColumn, StringColumn, ValueListColumn } from "@remult/core";

@EntityClass
export class DriverPrefsSchedule extends IdEntity {

    driverPrefsId = new StringColumn({});//fk
    dayOfWeek = new DayOfWeekColumn();
    dayPeriod = new DayPeriodColumn();

    constructor(private context: Context) {
        super({
            name: "driversPrefsSchedules",
            allowApiCRUD: c => c.isSignedIn(),
            allowApiRead: c => c.isSignedIn(),
        });
    }
}

export class DayPeriod {
    static morning = new DayPeriod();
    static afternoon = new DayPeriod('red');
    static both = new DayPeriod('red');
    constructor(public color = 'green') { }
    id;
}

export class DayPeriodColumn extends ValueListColumn<DayPeriod>{
    // constructor() {
    //     super(DayPeriod);
    // }
    constructor(options?:ColumnSettings<DayPeriod>) {
        // super(DayOfWeek);
        super(DayPeriod, {
            defaultValue: DayPeriod.morning,
            ...options
        });
    }
}

export class DayOfWeek {
    static sunday = new DayOfWeek();
    static monday = new DayOfWeek();
    static tuesday = new DayOfWeek();
    static wednesday = new DayOfWeek();
    static thursday = new DayOfWeek();
    static friday = new DayOfWeek();
    static saturday = new DayOfWeek();
    static all = new DayOfWeek();
    static work = new DayOfWeek();
    constructor(public color = 'green') { }
    id;
}

export class DayOfWeekColumn extends ValueListColumn<DayOfWeek>{
    constructor(options?:ColumnSettings<DayOfWeek>) {
        // super(DayOfWeek);
        super(DayOfWeek, {
            // defaultValue: ByDate.today,
            ...options
        });
    }
}
