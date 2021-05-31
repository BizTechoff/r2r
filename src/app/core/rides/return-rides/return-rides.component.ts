import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, Filter, ServerController, ServerFunction, ServerMethod } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { GridDialogComponent } from '../../../common/grid-dialog/grid-dialog.component';
import { Roles } from '../../../users/roles';
import { Ride, RideStatus } from '../ride';


@ServerController({ key: 'returnRidesProvider', allowed: true })
class returnRidesProviderParams {
  date = new DateColumn({ defaultValue: new Date() });
  constructor(private context: Context) { }

  @ServerMethod()
  async retrieveRideList4UsherSetDriver(): Promise<Ride[]> {
    var result: Ride[] = [];

    result = await this.context.for(Ride).find({
      where: r => r.date.isEqualTo(this.date)
        .and(r.status.isIn(...RideStatus.isInCanBackRideStatuses))
        .and(new Filter((f) => { f.isNull(r.backId) }))
        .and(new Filter((f) => { f.isDifferentFrom(r.backId, '') }))
    });

    // for await (const ride of this.context.for(Ride).iterate({
    //   where: r => r.date.isEqualTo(this.date)
    //     .and(r.status.isIn(...RideStatus.isInCanBackRideStatuses))
    //     .and(new Filter((f) => { f.isNull(r.backId) }))
    //     .and(new Filter((f) => { f.isDifferentFrom(r.backId, '') }))
    // })) {
    //   let from = (await this.context.for(Location).findId(ride.fid.value)).name.value;
    //   let to = (await this.context.for(Location).findId(ride.tid.value)).name.value;
    //   let d = (await this.context.for(Driver).findId(ride.driverId.value));
    //   let patient = ride.isHasPatient() ? (await this.context.for(Patient).findId(ride.patientId.value)).name.value : "";

    //   let seats = 0;
    //   if (d) {
    //     seats = d.seats.value;
    //   }
    //   let dName = '';
    //   if (d) {
    //     dName = d.name.value;
    //   }

    //   let row = result.find(r => r.id === ride.id.value);
    //   if (!(row)) {
    //     row = {
    //       id: ride.id.value,
    //       patientId: ride.patientId.value,
    //       driverId: ride.driverId.value,
    //       from: from,
    //       to: to,
    //       driver: dName,
    //       patient: patient,
    //       dMobile: "",
    //       passengers: ride.passengers(),
    //       selected: false,
    //       visitTime: ride.visitTime.value,
    //       rid: ride.id.value,
    //       status: ride.status.value,
    //       freeSeats: seats,
    //       w4Accept: ride.status.value === RideStatus.waitingForAccept,
    //       w4Arrived: ride.status.value === RideStatus.waitingForArrived,
    //       w4End: ride.status.value === RideStatus.waitingForEnd,
    //       w4Pickup: ride.status.value === RideStatus.waitingForPickup,
    //       w4Start: ride.status.value === RideStatus.waitingForStart,
    //     };
    //     result.push(row);
    //   }
    // }

    // console.log(result)
    // result.sort((r1, r2) => r1.from.localeCompare(r2.from));

    return result;
  }
}

@Component({
  selector: 'app-return-rides',
  templateUrl: './return-rides.component.html',
  styleUrls: ['./return-rides.component.scss']
})
export class ReturnRidesComponent implements OnInit {

  today = new Date();
  params = new returnRidesProviderParams(this.context);

  ridesSettings = this.context.for(Ride).gridSettings({
 
    where: r => r.date.isEqualTo(this.today)//only empty
      .and(r.status.isIn(...[RideStatus.waitingForEnd, RideStatus.succeeded]))
      .and (r.backId.isEqualTo('').or(r.isBackRide.isEqualTo(false)))//rides(no-back-created) || !back-rides
      // .and((new Filter(f => f.isDifferentFrom(r.backId, ''))).or(new Filter(f => f.isNull(r.backId))))
    ,numOfColumnsInGrid: 10,
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


      // foundDriver = await this.context.openDialog(GridDialogComponent, ynq => ynq.args = {
      //   message: `There found other drivers(${more.length}) that make same back-ride locations, Whould you like to attach them to current back-ride`,
      //   isAQuestion: true,
      // })
    }

    let back = this.context.for(Ride).create();
    r.copyTo(back, true);
    let id = r.fid.value;
    back.fid.value = r.tid.value;
    back.tid.value = r.fid.value;
    back.status.value = RideStatus.waitingForDriver;
    back.isBackRide.value = true;
    if (foundDriver) {
      back.driverId.value = more[0].driverId.value;
      back.status.value = RideStatus.waitingForStart;
    }
    await back.save();
    r.backId.value = back.id.value;
    await r.save();
    await this.refresh();
  }

  // async edit

}

// let succeddedRides: Ride[] = [];
//     let w4ArriveRides: Ride[] = [];
//     let existsBackRidesNoDrivers: Ride[] = [];
//     let existsBackRidesWithDrivers: Ride[] = [];
//     // Check rides that back ride created
//     for await (const ride of this.context.for(Ride).iterate({
//       where: cur => cur.date.isEqualTo(r.date)
//         .and(cur.fid.isEqualTo(r.fid))
//         .and(cur.tid.isEqualTo(r.tid))
//       // .and(new Filter((f) => f.isNotNull(cur.backId)))
//       // .and(new Filter((f) => f.isDifferentFrom(cur.backId, '')))
//       // .and(new Filter((f) => f.isNotNull(cur.driverId)))
//       // .and(new Filter((f) => f.isDifferentFrom(cur.driverId, '')))
//       // .and(r.status.isNotIn(RideStatus.waitingForArrived))
//     })) {

//       if (ride.isExsistBakcup()) {
//         let exists = await this.context.for(Ride).findId(ride.backId.value);
//         if (exists) {
//           if (exists.fid.value == r.tid.value && exists.tid.value == r.fid.value) {// same locations
//             if (exists.status.value == RideStatus.waitingForDriver) {
//               existsBackRidesNoDrivers.push(exists);
//             }
//             else if (exists.status.value == RideStatus.waitingForAccept) {
//               existsBackRidesWithDrivers.push(exists);
//             }
//             else if (exists.status.value == RideStatus.waitingForStart) {//=has driver & still not start
//               existsBackRidesWithDrivers.push(exists);
//             }
//           }
//         }
//         else { throw `BackupId Not Found (${ride.backId.value})`; }
//       }
//       else {
//         if (ride.status.value == RideStatus.waitingForArrived) {
//           w4ArriveRides.push(ride);
//           // let found = w4ArriveRides.find(r => r.id.value == ride.id.value);
//           // if (!(found)) {
//           //   w4ArriveRides.push(ride);
//           // }
//         }
//         if (ride.status.value == RideStatus.waitingForEnd) {
//         }
//         if (ride.status.value == RideStatus.succeeded) {
//           succeddedRides.push(ride);
//         }
//       }
//     }
//   }

