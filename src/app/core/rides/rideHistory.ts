import { formatDate } from "@angular/common";
import { Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, StringColumn } from "@remult/core";
import { GridDialogComponent } from "../../common/grid-dialog/grid-dialog.component";
import { TimeColumn } from "../../shared/types";
import { addDays, resetTime } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { UserId } from "../../users/users";
import { LocationIdColumn } from "../locations/location";
import { RideIdColumn, RideStatusColumn } from "./ride";

@EntityClass
export class RideHistory extends IdEntity {
 
    fid = new LocationIdColumn({},this.context);
    tid = new LocationIdColumn({},this.context);
    rid = new RideIdColumn(this.context);
    date = new DateColumn();
    // visitTime = new StringColumn({defaultValue: '00:00', inputType: 'time'});
    pickupTime = new TimeColumn();
    status = new RideStatusColumn();
    // escortsCount = new NumberColumn({});
    // pid = new PatientIdColumn(this.context);
    // did = new DriverIdColumn({},this.context);
    changed = new DateTimeColumn();
    changedBy = new UserId(this.context);

    constructor(private context: Context) {
        super({
            name: 'ridesHistory',
            allowApiInsert: [Roles.matcher, Roles.usher, Roles.admin],
            allowApiUpdate: false,
            allowApiDelete: false,
            allowApiRead: [Roles.matcher, Roles.usher, Roles.admin],

            saving: async () => {
                if (context.onServer) {
                    if (this.isNew()) {
                        this.changed.value = new Date();
                        this.changedBy.value = this.context.user.id;
                    }
                }
            },
        });
    }

    static async openRideHistoryDialog(context:Context, date:Date) {
        let dateStart = resetTime(date);
        let dateEnd = addDays(+1, dateStart);
        await context.openDialog(GridDialogComponent, gd => gd.args = {
          title: `Rides Changes For ${formatDate(dateStart, 'dd.MM.yyyy', 'en-US')}`,
          settings: context.for(RideHistory).gridSettings({
            where: cur => cur.changed.isGreaterOrEqualTo(dateStart)
              .and(cur.changed.isLessThan(dateEnd)),
            orderBy: cur => [{ column: cur.changed, descending: true }],
            allowCRUD: false,// this.context.isAllowed([Roles.admin, Roles.usher]),
            allowDelete: false,
            //showPagination: false,
            numOfColumnsInGrid: 10,
            columnSettings: cur => [
              cur.date,
              cur.pickupTime,
              cur.status,
              cur.changed,
              cur.changedBy,
            ],
          })
        });
      }
}
