import { BoolColumn, ColumnOptions, ColumnSettings, Context, EntityClass, IdEntity, ServerFunction, StringColumn, ValueListColumn } from "@remult/core";
import { DynamicServerSideSearchDialogComponent } from "../../common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component";
import { Roles } from "../../users/roles";

@EntityClass
export class Mabat extends IdEntity {

    name = new StringColumn({});
    groupBy1Level = new MabatGroupByColumn({});
    groupBy2Level = new MabatGroupByColumn({});
    groupBy3Level = new MabatGroupByColumn({});
    groupBy4Level = new MabatGroupByColumn({});
    groupBy5Level = new MabatGroupByColumn({});
    isDefault = new BoolColumn({});
    isPrivate = new BoolColumn({});

    constructor(private context: Context) {
        super({
            name: "mabats",
            allowApiCRUD: [Roles.usher, Roles.admin],
            allowApiRead: [Roles.usher, Roles.admin],
            defaultOrderBy: () => this.name,

            saved: async () => {
                if (context.onServer) {
                    if (this.isDefault.value && this.wasChanged()) {
                        await Mabat.clearOtherDefaults(this.id.value);
                    }
                }
            },
        });
    }

    @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
    static async clearOtherDefaults(currentId: string, context?: Context) {
        for await (const m of context.for(Mabat).iterate()) {
            if (m.id.value === currentId) { }
            else {
                m.isDefault.value = false;
                await m.save();
            }
        }
    }

}


export class MabatIdColumn extends StringColumn {

    constructor(private context: Context, options?: ColumnSettings) {
        super({
            dataControlSettings: () => ({
                getValue: () => this.context.for(Mabat).lookup(this).name.value,
                hideDataOnInput: true,
                clickIcon: 'search',
                click: (m) => {
                    this.context.openDialog(DynamicServerSideSearchDialogComponent,
                        x => x.args(Mabat, {
                            onSelect: m => this.value = m.id.value,
                            searchColumn: m => m.name
                        }));
                }
            }),
            ...options
        });
    }
}

export class MabatGroupBy {

    static root = new MabatGroupBy();
    static dateperiod = new MabatGroupBy();
    static date = new MabatGroupBy();
    static period = new MabatGroupBy();
    static fromto = new MabatGroupBy();
    static from = new MabatGroupBy();
    static to = new MabatGroupBy();
    static none = new MabatGroupBy();
    static status = new MabatGroupBy();
    
    static passengers = new MabatGroupBy();
    static daysFromLastTime = new MabatGroupBy();
    static percentSucceededRidesCount = new MabatGroupBy();
    static driver = new MabatGroupBy();
    static patient = new MabatGroupBy();
    static visitTime = new MabatGroupBy();
    constructor(public color = 'green') { }
    id;
    private static priority: MabatGroupBy[] = [
        MabatGroupBy.root,
        // MabatGroupBy.status,
        MabatGroupBy.dateperiod,
        //  MabatGroupBy.date,
        //  MabatGroupBy.period,
        MabatGroupBy.fromto, 
        // MabatGroupBy.from, 
        // MabatGroupBy.to,
        // MabatGroupBy.patient,
        MabatGroupBy.driver,
        MabatGroupBy.none,
    ];
  
    static nextGroupBy(current: MabatGroupBy) {
        let index = this.priority.indexOf(current);
        if (index >= 0) {
            let count = this.priority.length;
            ++index;
            if (count > index) {
                return this.priority[index];
            }
        }
        return current;
    }
}

export class MabatGroupByColumn extends ValueListColumn<MabatGroupBy>{
    constructor(options?: ColumnSettings<MabatGroupBy>) {
        super(MabatGroupBy, {
            defaultValue: MabatGroupBy.date,
            ...options
        });
    }
}
