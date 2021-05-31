import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, ServerController } from '@remult/core';
import { YesNoQuestionComponent } from '../../../common/yes-no-question/yes-no-question.component';
import { Roles } from '../../../users/roles';
import { Ride, RideStatus } from '../../rides/ride';
import { addDays } from '../../usher/usher';
import { Patient } from '../patient';


@ServerController({ key: 'm', allowed: [Roles.matcher, Roles.admin] })
class matcherService {
  date = new DateColumn({ defaultValue: new Date(), valueChange: async () => await this.onChanged() });
  onChanged: () => void;
  constructor(onChanged: () => void) {
    this.onChanged = onChanged;
  }
}


@Component({
  selector: 'app-approve-patient-ride',
  templateUrl: './approve-patient-ride.component.html',
  styleUrls: ['./approve-patient-ride.component.scss']
})
export class ApprovePatientRideComponent implements OnInit {

  params = new matcherService(async () => await this.refresh());
  ridesSettings = this.context.for(Ride).gridSettings({
    where: r => r.date.isEqualTo(this.params.date)
      .and(r.status.isNotIn(RideStatus.succeeded)),
    numOfColumnsInGrid: 10,
    columnSettings: (r) => [
      r.patientId,
      // r.driverId,
      r.fid,
      r.tid,
      r.status,
      r.date,
      r.visitTime//,
      // { column: r.mApproved, caption: 'Approved' }
    ],
    rowButtons: [
      {
        textInMenu: 'Approve',
        icon: 'how_to_reg',
        click: async (r) => { await this.approve(r); },
        visible: (r) => { return r.status.value === RideStatus.waitingForStart && !r.mApproved.value },
      },
    ],
  });

  constructor(private context: Context) {
    // SetTime: 00:00:00.0 = MidNigth
    this.params.date.value = new Date(this.params.date.value.getFullYear(), this.params.date.value.getMonth(), this.params.date.value.getDate());
  }

  async refresh() {
    this.ridesSettings.reloadData();
  }

  static async retrieve() {

  }

  ngOnInit() {
  }

  async approve(r: Ride) {
    r.mApproved.value = true;
    await r.save();

    let pName = await (await this.context.for(Patient).findId(r.patientId)).name.value;
    let answer = await this.context.openDialog(YesNoQuestionComponent, ynq => ynq.args = {
      message: `You approved ride! Tell '${pName}' to be at '${r.visitTime}' at '${r.fid.displayValue}'? ()`,
      isAQuestion: true,
    });
    if (answer && answer == true) {
      console.log(`Send Message To: ${pName}, Hi found a ride for you: driver, Please be at 'place' on time 'HH:mm', TX.`);
    }
  }

  async prevDay() {
    this.params.date.value = addDays(-1, this.params.date.value);
  }

  async nextDay() {
    this.params.date.value = addDays(+1, this.params.date.value);
  }

}
