import { DayOfWeek } from "../core/drivers/driverPrefSchedule";

export class Utils {

static fixMobile(value: string) {
    if(!(value)){
        return value;
    }
    value = value.replace('-','').trim();
    value = value.slice(0,3) + "-" + value.slice(3);
    return value;
}

    static isValidMobile(value: string) {
        if(!(value)){
            return false;
        }
        value = value.replace('-','').trim();
        if(value.length < 9){
            return false;
        }
        if(value.length == 9){
            value = "0" + value;
        }
        if(!value.startsWith('05')){
            return false;
        }
        for (let i = 0; i < value.length; ++i) {
            if(!['0','1','2','3','4','5','6','7','8','9'].includes( value[i])){
                return false;
            }
        }
        return true;
    }

    static getDayOfWeek(dayNum: number) {
        return this.getDayOfWeekFromString(dayNum.toString());
    }

    static getDatePart(date:Date){
        return date.setHours(0,0,0,0);
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