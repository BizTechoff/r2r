import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DataAreaSettings } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { Ride, RideStatus, RideStatusColumn } from '../../rides/ride';

@Component({
  selector: 'app-driver-ride-problem',
  templateUrl: './driver-ride-problem.component.html',
  styleUrls: ['./driver-ride-problem.component.scss']
})
export class DriverRideProblemComponent implements OnInit {

  args: { rid: string, status?: RideStatus } = { rid: '' };
  problem = new RideStatusColumn({ defaultValue: RideStatus.PatientNotFound });
  options = new DataAreaSettings({
    columnSettings: () => [
      { column: this.problem, valueList: [RideStatus.PatientNotFound, RideStatus.WrongAddress] }
    ]
  });
  comment = '';
  originComment = '';

  constructor(private context: Context, private dialog: DialogService, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    if (this.args.rid && this.args.rid.length > 0) {
      let ride = await this.context.for(Ride).findId(this.args.rid);
      if (!ride) {
        throw new Error("Ride NOT FOUND!?");
      }
      if (ride.dFeedback.value) {
        this.originComment = ride.dFeedback.value;
        this.comment = ride.dFeedback.value;
      }
    }
  }

  async save(thenClose = true) {
    let yes = await this.dialog.yesNoQuestion('Are You Sure Set Ride Status To Problem');
    if (yes) {
      if (this.originComment !== this.comment) {
        let ride = await this.context.for(Ride).findId(this.args.rid);
        ride.status.value = this.problem.value;
        ride.dFeedback.value = this.comment;
        await ride.save();
        this.args.status = this.problem.value;
      } 
    }
    await this.dialog.info('TX!!');
    if (thenClose) {
      this.dialogRef.close();
    }
  }

}

