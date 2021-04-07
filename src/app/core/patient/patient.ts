import { BoolColumn, Context, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";

@EntityClass
export class Patient extends IdEntity {

    driverId = new StringColumn({});
    assignChanged = new DateTimeColumn({});
    name = new StringColumn({});
    mobile = new StringColumn({});
    idNumber = new StringColumn({});
    fromAddress = new StringColumn({caption: "From Security checkpoint"});
    toAddress = new StringColumn({caption: "To Hospital"});
    fromHour = new DateTimeColumn({});
    toHour = new DateTimeColumn({});
    isNeedWheelchair = new BoolColumn({});
    isHasEscort = new BoolColumn({});
    escortsCount = new NumberColumn({});

    constructor(private context: Context){
        super({
            name: "patients",
        });
    }
}
