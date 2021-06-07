import { ServerFunction } from "@remult/core";
import * as fetch from 'node-fetch';

export interface SendSmsResponse {
    success: boolean,
    error: string
};

export class SendSms {
    args: {
        mobile: string,
        message: string
    } = { mobile: '0526526063', message: 'r2r: Test Message' };

    constructor(mobile:string, message:string){
        this.args.mobile = mobile;
        this.args.message = message;
    }

    async send() {
        let response = await SendSms.SendSms(this.args.mobile, this.args.message);
        return response;
    }

    @ServerFunction({ allowed: c => c.isSignedIn() })
    static async SendSms(mobile: string, message: string): Promise<SendSmsResponse> {
        let result: SendSmsResponse = { success: false, error: '' };
        let url = `https://api.multisend.co.il/MultiSendAPI/sendsms?` +
            `user=${process.env.SMS_ACCOUNT}` +
            `&password=${process.env.SMS_PASSWORD}` +
            `&from=${process.env.SMS_FROM_NAME}` +
            `&recipient=${mobile}` +
            `&message=${message}`;

        console.log(`SendSms.send: ${url}`);

        try {
            let r = await fetch.default(url, {
                method: 'GET'
            });
            let res = await r.text();
            let succesfuly = "\"success\":\"true\"";
            result.success = (res.includes(succesfuly));
            result.error = res;
            console.log(`SendSms.return: ${res}`);
        } catch (error) {
            console.log(`SendSms.error: ${error}`);
            result.error = error;
        }

        return result;
    }

}