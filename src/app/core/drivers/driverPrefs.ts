import { BoolColumn, ColumnSettings, Context, EntityClass, IdEntity, ValueListColumn } from "@remult/core";
import { Location, LocationIdColumn } from "../locations/location";
import { DriverIdColumn } from "./driver";

@EntityClass
export class DriverPrefs extends IdEntity {

    driverId = new DriverIdColumn({}, this.context);
    locationId = new LocationIdColumn({allowNull: true}, this.context, { onlyBorder: true });

    // isAlsoBack = new BoolColumn({});
    // dayOfWeek = new DayOfWeekColumn();
    // dayPeriod = new DayPeriodColumn();

    constructor(private context: Context) {
        super({
            name: "driversPrefs",
            allowApiCRUD: c => c.isSignedIn(),// [Roles.driver, Roles.admin],
            allowApiRead: c => c.isSignedIn(),
        });
    }

    async getLocationName() {
        var result = "";
        if (this.locationId && this.locationId.value) {
            var location = await this.context.for(Location).findId(
                this.locationId.value);
            if (location) {
                result = location.name.value;
            }
        }
        return result;
    }

    static getDayOfWeek(dayNum: number) {
        return this.getDayOfWeekFromString(dayNum.toString());
    }

    static getDayOfWeekFromString(desc: string) {
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

    static getDayPeriod(desc: string) {
        switch (desc) {
            case "אחהצ":
            case "אחה\"צ":
            case "אחר הצהריים":
            case "afternoon":
                return DayPeriod.afternoon;
            case "בוקר":
            case "morning":
                return DayPeriod.morning;

            default:
                break;
        }
    }
}


export class DayPeriod {
    static morning = new DayPeriod();
    static afternoon = new DayPeriod('red');
    // static both = new DayPeriod('red');
    constructor(public color = 'green') { }
    id;
}

export class DayPeriodColumn extends ValueListColumn<DayPeriod>{
    // constructor() {
    //     super(DayPeriod);
    // }
    constructor(options?: ColumnSettings<DayPeriod>) {
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
    // static all = new DayOfWeek();
    // static work = new DayOfWeek();
    constructor(public color = 'green') { }
    id;
}

export class DayOfWeekColumn extends ValueListColumn<DayOfWeek>{
    constructor(options?: ColumnSettings<DayOfWeek>) {
        // super(DayOfWeek);
        super(DayOfWeek, {
            // defaultValue: ByDate.today,
            ...options
        });
    }
}

// export class DriverPrefsIdColumn extends StringColumn {

//     constructor(private context: Context, caption: string, dbName: string) {
//         super({
//             caption: caption,
//             dbName: dbName,
//             dataControlSettings: () => ({
//                 getValue: () => this.context.for(DriverPrefs).lookup(this).name.value,
//                 hideDataOnInput: true,
//                 clickIcon: 'search',
//                 click: () => {
//                     this.context.openDialog(DynamicServerSideSearchDialogComponent,
//                         x => x.args(DriverPrefs, {
//                             onSelect: l => this.value = l.id.value,
//                             searchColumn: l => l.name
//                         }));
//                 }
//             })
//         });
//     }
// }
