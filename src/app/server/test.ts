import { ServerContext, SqlDatabase } from "@remult/core";
import { Driver } from "../core/drivers/driver";
SqlDatabase.LogToConsole=true;

export async function testIt(db: SqlDatabase){
    let context = new ServerContext(db);
    let c = await context.for(Driver).count();
    console.log('count: ' + c);
    c= 0;
    for await (const d of context.for(Driver).iterate()){
      ++c;
    } 
    console.log('count: ' + c);
}