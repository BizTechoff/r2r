import { ColumnSettings, DateColumn, Filter, ValueListColumn } from "@remult/core";


export class ByDate {
    static yesterday = new ByDate(d => d.isEqualTo(addDays(-1)));
    static today = new ByDate(d => d.isEqualTo(new Date()));
    static tomorrow = new ByDate(d => d.isEqualTo(addDays(1)));
    static todayAndAbove = new ByDate(d => d.isGreaterOrEqualTo(new Date()));
    static yesterdayAndBelow = new ByDate(d => d.isLessThan(new Date()));
    static all = new ByDate(d => new Filter(x => { }));
    constructor(public filter: (date: DateColumn) => Filter) { }
    id;
}

export function addDays(days: number) {
    var x = new Date();
    x.setDate(x.getDate() + days);
    return x;
}
export class ByDateColumn extends ValueListColumn<ByDate>{
    constructor(options?:ColumnSettings<ByDate>) {
        super(ByDate, {
            defaultValue: ByDate.today,
            ...options
        });
    }
}

