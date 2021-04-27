import { Context, Role, ServerFunction } from "@remult/core";
import { DialogService } from "../common/dialog";
import { Driver } from "../core/drivers/driver";
import { Roles } from "../users/roles";

export class SmsService {

    @ServerFunction({ allowed: Roles.usher })
    static async SendApproovedToDriver(driverId: string, context?: Context) {
        let mobile = (await context.for(Driver).findId(driverId)).mobile.value;
        console.log(`Sms 'ApproovedToDriver' Sent To Mobile '${{ mobile }}'`);
        return true;
    }
}