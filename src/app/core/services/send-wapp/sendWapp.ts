import { ServerFunction } from "@remult/core";

export interface SendWappResponse {
    success: boolean,
    error: string
};

export class SendWapp {
    args: {
        mobile: string,
        message: string
    } = { mobile: '0526526063', message: 'r2r: Test Message' };

    constructor(mobile: string, message: string) {
        this.args.mobile = mobile;
        this.args.message = message;
    }

    async send() {
        await SendWapp.SendWapp(this.args.mobile, this.args.message);
    }

    @ServerFunction({ allowed: c => c.isSignedIn() })
    static async SendWapp(mobile: string, message: string): Promise<void> {
        window.open('https://wa.me/' + mobile + '?text=' + encodeURI(message), '_blank');
    }

}
