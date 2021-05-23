import { Component, OnInit } from '@angular/core';
import { Context, Filter, ServerFunction } from '@remult/core';
import { YesNoQuestionComponent } from '../../../common/yes-no-question/yes-no-question.component';
import { Roles } from '../../../users/roles';
import { Ride, RideStatus } from '../ride';

@Component({
  selector: 'app-return-rides',
  templateUrl: './return-rides.component.html',
  styleUrls: ['./return-rides.component.scss']
})
export class ReturnRidesComponent implements OnInit {

  today = new Date(2021, 2, 3);

  ridesSettings = this.context.for(Ride).gridSettings({
    where: r => r.date.isEqualTo(this.today)
      .and(r.status.isIn(...RideStatus.isCanBackRide))
      .and(r.hadBackId() ? new Filter(() => false) : new Filter(() => { })),
    rowButtons: [
      {
        textInMenu: 'Create Back Ride',
        icon: 'rv_hookup',
        showInLine: true,
        click: (r) => { this.addBackRide(r); },
      }
    ],
  });

  constructor(private context: Context) { }

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

    let rides: Ride[] = [];
    for await (const ride of this.context.for(Ride).iterate({
      where: br => br.fromLocation.isEqualTo(r.toLocation)
        .and(br.toLocation.isEqualTo(r.fromLocation))
        .and(br.isHasDriver() ? new Filter(() => { }) : new Filter(() => { false }))
        .and(r.status.isNotIn(RideStatus.waitingForArrived))
    })) {
      rides.push(ride);
    }
    let foundDriver = false;
    if (rides.length > 0) {
      foundDriver = await this.context.openDialog(YesNoQuestionComponent, ynq => ynq.args = {
        message: 'There found other driver(s) that make same ride locations, Whould you like to attach them to current back-ride',
        isAQuestion: true,
      })
    }

    let back = this.context.for(Ride).create();
    r.copyTo(back, true);
    let id = r.fromLocation.value;
    back.fromLocation.value = r.toLocation.value;
    back.toLocation.value = r.fromLocation.value;
    back.status.value = RideStatus.waitingForDriver;
    if (foundDriver) {
      back.driverId.value = rides[0].driverId.value;
      back.status.value = RideStatus.waitingForStart;
    }
    await back.save();
    r.backId.value = back.id.value;
    await r.save();
    await this.refresh();
  }

}