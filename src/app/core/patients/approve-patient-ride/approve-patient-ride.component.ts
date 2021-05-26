import { Component, OnInit } from '@angular/core';
import { Context, Filter } from '@remult/core';
import { YesNoQuestionComponent } from '../../../common/yes-no-question/yes-no-question.component';
import { Ride, RideStatus } from '../../rides/ride';
import { Patient } from '../patient';

@Component({
  selector: 'app-approve-patient-ride',
  templateUrl: './approve-patient-ride.component.html',
  styleUrls: ['./approve-patient-ride.component.scss']
})
export class ApprovePatientRideComponent implements OnInit {

  today = new Date();
  ridesSettings = this.context.for(Ride).gridSettings({
    where: r => r.date.isGreaterOrEqualTo(this.today),
      // .and(new Filter(f => f.isNotNull(r.driverId)))
      // .and(new Filter(f => f.isDifferentFrom(r.driverId, ''))),
    // .and(r.status.isIn(RideStatus.waitingForStart)),
    numOfColumnsInGrid: 10,
    columnSettings: (r) => [
      r.patientId,
      // r.driverId,
      r.fid,
      r.tid,
      r.status,
      r.date,
      r.visitTime,
    ],
    rowButtons: [
      {
        textInMenu: 'Approve',
        icon: 'how_to_reg',
        click: async (r) => { await this.approve(r); },
        visible: (r) => {return r.status.value === RideStatus.waitingForStart},
      },
    ],
  });

  constructor(private context: Context) {

    this.today = new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
  }

  async refresh() {
    this.ridesSettings.reloadData();
  }

  static async retrieve() {

  }

  ngOnInit() {
  }

  async approve(r: Ride) {
    let pName = await (await this.context.for(Patient).findId(r.patientId)).name.value;
    let answer = await this.context.openDialog(YesNoQuestionComponent, ynq => ynq.args = {
      message: `You approved ride! Send message to patient? (${pName})`,
      isAQuestion: true,
    });
    if (answer && answer == true) {
      console.log(`Send Message To: ${pName}, Hi found a ride for you: driver, Please be at 'place' on time 'HH:mm', TX.`);
    }
  }

}
