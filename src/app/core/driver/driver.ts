import { EntityClass, IdEntity, StringColumn } from "@remult/core";

@EntityClass
export class Driver extends IdEntity {

    name = new StringColumn({});
    mobile = new StringColumn({});
}
