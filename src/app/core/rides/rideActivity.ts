import { formatDate } from "@angular/common";
import { Context, DateColumn, DateTimeColumn, EntityClass, IdEntity, NumberColumn, StringColumn } from "@remult/core";
import { GridDialogComponent } from "../../common/grid-dialog/grid-dialog.component";
import { TimeColumn, TODAY } from "../../shared/types";
import { addDays, daysDiff, resetTime, timeDiff } from "../../shared/utils";
import { Roles } from "../../users/roles";
import { UserId } from "../../users/users";
import { DriverIdColumn } from "../drivers/driver";
import { LocationIdColumn } from "../locations/location";
import { PatientIdColumn } from "../patients/patient";
import { RideIdColumn, RideStatusColumn } from "./ride";
import { RideCrudComponent } from "./ride-crud/ride-crud.component";

@EntityClass
export class RideActivity extends IdEntity {

  rid = new RideIdColumn(this.context);
  pid = new PatientIdColumn(this.context);
  line = new StringColumn();
  what = new StringColumn();
  values = new StringColumn();
  changed = new DateTimeColumn();
  changedBy = new UserId(this.context);

  constructor(private context: Context) {
    super({
      name: 'ridesActivities',
      allowApiInsert: [Roles.matcher, Roles.usher, Roles.admin],
      allowApiUpdate: false,
      allowApiDelete: false,
      allowApiRead: [Roles.matcher, Roles.usher, Roles.admin],

      saving: async () => {
        if (context.onServer) {
          if (this.isNew()) {
            this.changed.value = addDays(TODAY, undefined, false);
            this.changedBy.value = this.context.user.id;
          }
        }
      },
    });
  }

  static async openRideActivityDialog(context: Context, date: Date) {
    let dateStart = resetTime(date);
    let dateEnd = addDays(+1, dateStart);
    await context.openDialog(GridDialogComponent, gd => gd.args = {
      title: `Rides Activities For ${formatDate(dateStart, 'dd.MM.yyyy', 'en-US')}`,
      settings: context.for(RideActivity).gridSettings({
        where: cur => cur.changed.isGreaterOrEqualTo(dateStart)
          .and(cur.changed.isLessThan(dateEnd)),
        orderBy: cur => [{ column: cur.changed, descending: true }],
        allowCRUD: false,// this.context.isAllowed([Roles.admin, Roles.usher]),
        allowDelete: false,
        //showPagination: false,
        numOfColumnsInGrid: 10,
        columnSettings: cur => [
          cur.pid,
          cur.line,
          cur.what,
          cur.values,
          {
            caption: 'before',
            column: cur.changed,
            getValue: (cur) => {
              let result = '';
              let days = daysDiff(addDays(0), cur.changed.value);
              if (days == 0) {
                let minutes = '';
                minutes = timeDiff(
                  formatDate(addDays(0, undefined, false), 'HH:mm', 'en-US'),
                  formatDate(cur.changed.value, 'HH:mm', 'en-US'))
                result = `${minutes} ${minutes > '00:59' ? 'hours' : 'minutes'}`;
              }
              else {
                result = `${days} days`;
              }
              return result;
            }
          },
          cur.changedBy,
          cur.changed
        ]//,
        // rowButtons: [
        //   {
        //     textInMenu: 'Edit Ride',
        //     click: async (cur) => {
        //       await context.openDialog(RideCrudComponent, dlg => dlg.args = {
        //         rid: cur.rid.value,
        //       });
        //     }
        //   }
        // ],
      })
    });
  }
}
