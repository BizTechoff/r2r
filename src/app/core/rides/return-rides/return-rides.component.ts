import { Component, OnInit } from '@angular/core';
import { Context, Filter, ServerFunction } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { Roles } from '../../../users/roles';
import { Ride, RideStatus } from '../ride';


@Component({
  selector: 'app-return-rides',
  templateUrl: './return-rides.component.html',
  styleUrls: ['./return-rides.component.scss']
})
export class ReturnRidesComponent implements OnInit {

  today = new Date();
  ridesSettings = this.context.for(Ride).gridSettings({
    where: r => r.date.isEqualTo(this.today)//only empty
      .and(r.status.isIn(...[RideStatus.waitingForEnd, RideStatus.succeeded]))
      .and(r.backId.isEqualTo('').or(r.isBackRide.isEqualTo(false)))//rides(no-back-created) || !back-rides
    // .and((new Filter(f => f.isDifferentFrom(r.backId, ''))).or(new Filter(f => f.isNull(r.backId))))
    , numOfColumnsInGrid: 10,
    columnSettings: r => [
      r.patientId,
      r.fid,
      r.tid,
      r.driverId,
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
    // await ReturnRidesComponent.retrieve();
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
        .and(new Filter(f => f.isNotNull(cur.driverId)))
        .and(new Filter(f => f.isDifferentFrom(cur.driverId, '')))
        .and(r.status.isNotIn(RideStatus.waitingForArrived))//not start yet
    })) {
      more.push(ride);
    }

    let foundDriver = false;
    if (more.length > 0) {

      await this.dialog.info("Found Other Drivers Same Locations")
      await this.context.openDialog(GridDialogComponent, gd => gd.args = {
        title: `Same Bakc Ride Locations`,
        settings: this.context.for(Ride).gridSettings({
          where: cur => cur.date.isEqualTo(this.today)
            .and(cur.fid.isEqualTo(r.tid))
            .and(cur.tid.isEqualTo(r.fid))
            .and(new Filter(f => f.isNotNull(cur.driverId)))
            .and(new Filter(f => f.isDifferentFrom(cur.driverId, '')))
            .and(r.status.isNotIn(RideStatus.waitingForArrived)),//not start yet
          // orderBy: cur => [{ column: cur.modified.value ? cur.modified : cur.created, descending: true }, { column: cur.created.value ? cur.created : cur.modified, descending: true }],
          // newRow: c => { c.dId.value = d.id.value; },
          allowCRUD: this.context.isAllowed([Roles.admin, Roles.usher]),
          allowDelete: false,
          showPagination: false,
          numOfColumnsInGrid: 10,
          columnSettings: c => [
            c.driverId,
          ],
        }),
      });
    }

    let back = await r.createBackRide();
    if (foundDriver) {
      back.driverId.value = more[0].driverId.value;
      back.status.value = RideStatus.waitingForStart;
    }
    await back.save();
    await this.refresh();
  }

}
