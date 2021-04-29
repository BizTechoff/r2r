import { ServerFunction } from "@remult/core";

export class Utils {

    @ServerFunction({ allowed: true })
    static async getServerDate() {
        return new Date(2020,1,1);
    }

    static fixMobile(value: string) {
        if (!(value)) {
            return value;
        }
        value = value.replace('-', '').trim();
        value = value.slice(0, 3) + "-" + value.slice(3);
        return value;
    }

    static isValidMobile(value: string) {
        if (!(value)) {
            return false;
        }
        value = value.replace('-', '').trim();
        if (value.length < 9) {
            return false;
        }
        if (value.length == 9) {
            value = "0" + value;
        }
        if (!value.startsWith('05')) {
            return false;
        }
        for (let i = 0; i < value.length; ++i) {
            if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(value[i])) {
                return false;
            }
        }
        return true;
    }

    static getDatePart(date: Date) {
        return date.setHours(0, 0, 0, 0);
    }
}