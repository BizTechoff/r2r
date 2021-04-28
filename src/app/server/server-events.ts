import { Express, Response } from 'express';
import { ServerEventsService } from './server-events-service'; 
import { Context, ServerContext } from '@remult/core';
import { ExpressRequestBridgeToDataApiRequest } from '@remult/server';
import { Roles } from '../users/roles';





let tempConnections: any = {};
ServerEventsService.authorize = (key, context) => {
    let x = tempConnections[key];
    if (x)
        x(context);
};
class userInChannel {
    write(message: string): void {
        this.response.write(message);
    }

    constructor(
        public response: Response) {

    }
}

export class ServerEvents {
    channels = new Map<string, userInChannel[]>();

    constructor(private app: Express) {
        ServerEventsService.OnServerSendMessageToChannel =(family,message)=>this.SendMessage(family,JSON.stringify( message));
        this.app.get('/api/stream', (req, res) => {
            //@ts-ignore
            let r = new ExpressRequestBridgeToDataApiRequest(req);
            let context = new ServerContext();
            context.setReq(r);
            res.writeHead(200, {
                "Access-Control-Allow-Origin": req.header('origin') ? req.header('origin') : '',
                "Access-Control-Allow-Credentials": "true",
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            let key = new Date().toISOString();
            let channel: string;
            tempConnections[key] = (context: Context) => {
                //the code that runs when autheticated
                if (context.isSignedIn()) {
                    channel = context.user.id ;//getInfo(context).familyId;
                    let x = this.channels.get(channel);
                    if (!x) {
                        x = [];
                        this.channels.set(channel, x);
                    }
                    x.push(new userInChannel(res));
                }
                tempConnections[key] = undefined;

            };
            res.write("event:authenticate\ndata:" + key + "\n\n");

            req.on("close", () => {
                tempConnections[key] = undefined;
                if (channel) {
                    let x = this.channels.get(channel);
                    if (x) {
                        let i = x.findIndex(x => x.response == res);
                        if (i >= 0)
                            x.splice(i, 1);
                    }
                }
            });
        });
    }

    SendMessage( channel: string,message: string) {
        let z = this;
        setTimeout(() => {

            let y = z.channels.get(channel);
            if (y)
                y.forEach(y => y.write("data:" + message + "\n\n"));
        }, 250);

    }
}