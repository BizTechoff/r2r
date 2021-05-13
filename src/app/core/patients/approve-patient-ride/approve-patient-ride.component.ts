import { Component, OnInit } from '@angular/core';
import { Context, Filter } from '@remult/core';
import { Ride, RideStatus } from '../../rides/ride';

@Component({
  selector: 'app-approve-patient-ride',
  templateUrl: './approve-patient-ride.component.html',
  styleUrls: ['./approve-patient-ride.component.scss']
})
export class ApprovePatientRideComponent implements OnInit {

  today = new Date();
  ridesSettings = this.context.for(Ride).gridSettings({
    where: r => r.date.isGreaterOrEqualTo(this.today)
      .and(r.isHasDriver() ? new Filter(() => { true }) : new Filter(() => { false }))
      .and(r.status.isIn(RideStatus.waitingForStart)),
    numOfColumnsInGrid: 10,
    columnSettings: (r) => [
      r.patientId,
      r.driverId,
    ],
    rowButtons: [
      {
        textInMenu: 'Approve',
        icon: '',
        click: async (r) => { await this.approve(r); },
      },
    ],
  });

  constructor(private context: Context) {

  }

  async refresh() {
    this.ridesSettings.reloadData();
  }

  static async retrieve() {

  }

  ngOnInit() {
  }

  async approve(r: Ride) {

  }

}
