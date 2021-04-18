import { DayOfWeek } from "../core/drivers/driverPrefSchedule";

export class Utils {

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
}