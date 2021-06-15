import { Component, OnInit } from '@angular/core';
import { Context, Filter, ServerFunction } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { TODAY } from '../../../shared/types';
import { addDays } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { Ride, RideStatus } from '../ride';


@Component({
  selector: 'app-return-rides',
  templateUrl: './return-rides.component.html',
  styleUrls: ['./return-rides.component.scss']
})
export class ReturnRidesComponent implements OnInit {

  today = addDays(TODAY);
  ridesSettings = this.context.for(Ride).gridSettings({
    where: r => r.date.isEqualTo(this.today)//only empty
      .and(r.status.isIn(...[RideStatus.waitingForArrived, RideStatus.waitingForEnd, RideStatus.succeeded]))
      .and(r.backId.isEqualTo('').or(r.isBackRide.isEqualTo(false)))//rides(no-back-created) || !back-rides
    // .and((new Filter(f => f.isDifferentFrom(r.backId, ''))).or(new Filter(f => f.isNull(r.backId))))
    , numOfColumnsInGrid: 10,
    columnSettings: r => [
      r.pid,
      r.fid,
      r.tid,
      r.did,
      r.status,
      r.statusDate,
      r.date,
      r.visitTime,
      // r.dRemark,
      // r.rRemark,
    ],
    rowButtons: [
      {
        textInMenu: 'Create Back Ride',
        icon: 'rv_hookup',
        showInLine: true,
        click: (r) => { this.addBackRide(r); },
      }
    ],
  });

  constructor(private context: Context, private dialog: DialogService) { }

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    await this.ridesSettings.reloadData();
    if (!(this.ridesSettings.items.length > 0)) {
      this.dialog.info("No Rides From TODAY");
    }
  }

  @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
  static async retrieve(context?: Context) {

  }

  async addBackRide(r: Ride) {

    let more: Ride[] = [];
    for await (const ride of this.context.for(Ride).iterate({
      where: cur => cur.date.isEqualTo(this.today)
        .and(cur.fid.isEqualTo(r.tid))
        .and(cur.tid.isEqualTo(r.fid))
        .and(new Filter(f => f.isNotNull(cur.did)))
        .and(new Filter(f => f.isDifferentFrom(cur.did, '')))
        .and(r.status.isNotIn(RideStatus.waitingForArrived))//not start yet
    })) {
      more.push(ride);
    }

    let foundDriver = false;
    if (more.length > 0) {

      await this.dialog.info("Found Other Drivers Same Locations")
      await this.context.openDialog(GridDialogComponent, gd => gd.args = {
        title: `Same Back Ride Locations`,
        settings: this.context.for(Ride).gridSettings({
          where: cur => cur.date.isEqualTo(this.today)
            .and(cur.fid.isEqualTo(r.tid))
            .and(cur.tid.isEqualTo(r.fid))
            .and(new Filter(f => f.isNotNull(cur.did)))
            .and(new Filter(f => f.isDifferentFrom(cur.did, '')))
            .and(r.status.isNotIn(RideStatus.waitingForArrived)),//not start yet
          // orderBy: cur => [{ column: cur.modified.value ? cur.modified : cur.created, descending: true }, { column: cur.created.value ? cur.created : cur.modified, descending: true }],
          // newRow: c => { c.dId.value = d.id.value; },
          allowCRUD: this.context.isAllowed([Roles.admin, Roles.usher]),
          allowDelete: false,
          showPagination: false,
          numOfColumnsInGrid: 10,
          columnSettings: c => [
            c.did,
          ],
        }),
      });
    }

    let back = await r.createBackRide(this.dialog);
    if (foundDriver) {
      back.did.value = more[0].did.value;
      back.status.value = RideStatus.waitingForStart;
    }
    await back.save();
    await this.refresh();
  }

}
