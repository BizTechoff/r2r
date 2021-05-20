import { formatDate } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings, DateTimeColumn, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { getRideList4UsherParams, ride4UsherSetDriver } from '../../../shared/types';
import { Driver, DriverIdColumn } from '../../drivers/driver';
import { Location } from '../../locations/location';
import { Patient } from '../../patients/patient';
import { Ride, RideStatus } from '../../rides/ride';
import { Usher } from '../usher';

export interface rideRow {
  id: string,
  selected: boolean,
  from: string,
  to: string,
  driver?: string,
  dMobile?: string,
  visitTime: string,
  passengers: number,
  patient: string,
};

@Component({
  selector: 'app-set-driver',
  templateUrl: './set-driver.component.html',
  styleUrls: ['./set-driver.component.scss']
})
export class SetDriverComponent implements OnInit {
  clearSelections() {
    for (const row of this.rides) {
      row.selected = false;
    }
    this.selectedPassengers = 0;
  }

  driverSeats: number = 0;
  visitTime = "00:00";
  driverId = new DriverIdColumn({
    caption: "Select Driver To Set", valueChange: async () => {
      this.driverSeats = (await this.context.for(Driver).findId(this.driverId.value)).seats.value;
      if (this.selectedPassengers > this.driverSeats) {
        this.clearSelections();
      }
    }
  }, this.context);
  driverArea = new DataAreaSettings({
    columnSettings: () => [
      {
        column: this.driverId,
      },],
  });
  protected selectedPassengers: number = 0;
  protected fromName: string;
  protected toName: string;
  protected rides: ride4UsherSetDriver[];
  args: {
    date: Date,
    from: string,
    to: string,
  };
  constructor(protected context: Context, private dialog: DialogService) { }

  async ngOnInit() {
    this.fromName = (await this.context.for(Location).findId(this.args.from)).name.value;
    this.toName = (await this.context.for(Location).findId(this.args.to)).name.value;

    await this.retrieve();
  }

  async retrieve() {
    
    let params: getRideList4UsherParams = {
      date: this.args.date,
      fromId: this.args.from,
      toId: this.args.to,
    };

    this.rides = await Usher.getRideList4UsherSetDriver(params, this.context);
  }

  async setDriver() {
    let setStatusToApproved = this.dialog.yesNoQuestion("Set status To approved-by-driver");
    for (const r of this.rides) {
      if (r.selected) { 
        let ride = await this.context.for(Ride).findId(r.id);
        // ride.visitTime.value = 
        ride.driverId.value = this.driverId.value;
        ride.status.value = RideStatus.waitingForAccept;
        if (setStatusToApproved) {
          ride.status.value = RideStatus.waitingForStart;
        }
        await ride.save();
      }
    }
  }

  selectionRowChanged(r: rideRow) {
    this.selectedPassengers = 0;
    for (const row of this.rides) {
      if (row.selected) {
        this.selectedPassengers += row.passengers;
      }
    }
  }
  selectionAllChanged() {

  }

}


/*


    this.rides = await SelectedRidesComponent.retrieve(
      this.fromName, this.toName, this.args.date, this.args.from, this.args.to
    );
  }

  @ServerFunction({ allowed: [Roles.usher, Roles.admin] })
  static async retrieve(fromName: string, toName: string, date: Date, from: string, to: string, context?: Context) {
    let rows = [];
    if (date && from && to) {
      for await (const r of await context.for(Ride).find({
        where: (r) => r.date.isEqualTo(date)
          .and(r.status.isNotIn(...[RideStatus.succeeded]))
          .and(r.fromLocation.isEqualTo(from))
          .and(r.toLocation.isEqualTo(to))
        // .and(to && (to.trim().length > 0) ? r.toLocation.isEqualTo(to) : new Filter(x => { })),
      })) {
        let driverName = '';
        if (r.isHasDriver()) {
          driverName = (await context.for(Driver).findId(r.driverId.value)).name.value;
        }
        let visitTime = '';
        if (r.isHasVisitTime()) {
          visitTime = formatDate(r.visitTime.value, 'HH:mm', 'en-US');
        }
        rows.push({
          id: r.id.value,
          selected: false,
          from: fromName,
          to: toName,
          driver: driverName,
          visitTime: visitTime,
          passengers: r.passengers(),
        });
      }
    }
    return rows;
  }
*/