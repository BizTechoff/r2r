import { Component, OnDestroy, OnInit } from '@angular/core';
import { Context, NumberColumn, ServerFunction, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { DestroyHelper, ServerEventsService } from '../../../server/server-events-service';
import { Utils } from '../../../shared/utils';
import { Ride, RideStatus } from '../../rides/ride';
import { rides4Driver, Usher } from '../../usher/usher';
import { Driver } from '../driver';

@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.component.html',
  styleUrls: ['./driver-rides.component.scss']
})
export class DriverRidesComponent implements OnInit, OnDestroy {

  serverToday: Date;
  driver: Driver;
  //https://github.com/rintoj/ngx-virtual-scroller
  driverSuggestions: rides4Driver[];
  driverRegistered: rides4Driver[];

  constructor(private context: Context,
    private snakebar: DialogService,
    private events: ServerEventsService) {
    events.onMessage(async (message) => {
      console.log("got message: " + message.text, message);
    }, this.destroyHelper);
  }

  destroyHelper = new DestroyHelper();
  ngOnDestroy(): void {
    this.destroyHelper.destroy();
  }

  sendMessage() {
    DriverRidesComponent.sendMessage();
  }
  @ServerFunction({ allowed: true })
  static async sendMessage() {
    ServerEventsService.OnServerSendMessageToChannel("", { text: 'The message text' });

  }

  async ngOnInit() {
    this.driver = await this.context.for(Driver).findFirst(
      d => d.userId.isEqualTo(this.context.user.id),
    );
    this.serverToday = await Utils.getServerDate();

    await this.retrieve();
  }

  async retrieve() {

    this.driverRegistered = await Usher.getRegisteredRidesForDriver(
      this.driver.id.value);

    console.log(this.driverRegistered);

    if (this.driverRegistered.length == 0) {
      // this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }

    this.driverSuggestions = await Usher.getSuggestedRidesForDriver(
      this.driver.id.value);

    console.log(this.driverSuggestions);

    if (this.driverSuggestions.length == 0) {
      // this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }
  }

  async register(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Register To Ride",
        columnSettings: () => [
          {
            caption: "I'm Available From Hour",
            column: new StringColumn({ defaultValue: this.driver.defaultFromTime.value }),
          },
          {
            caption: "I'm Available till Hour",
            column: new StringColumn({ defaultValue: this.driver.defaultToTime.value }),
          },
          {
            caption: "Paasengers I can take",
            column: new NumberColumn({
              defaultValue: Math.min(ride.escortsCount.value + 1, this.driver.seats.value > 0 ? this.driver.seats.value : Number.MAX_VALUE),
              validate: () => { }
            }),//max,min
          },
          {
            caption: "Remarks",
            column: new StringColumn({}),
          },
        ],
        ok: async () => {
          ride.driverId.value = this.driver.id.value;
          ride.status.value = RideStatus.waitingFor20UsherApproove;
          await ride.save();
          this.snakebar.info("Thank You! We will contact you ASAP")
          await this.retrieve();
        }
      },
    )
  }

  async startDriving(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingFor40Pickup;
    await ride.save();
    await this.retrieve();
  }
 
  async pickup(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingFor50Arrived;
    await ride.save();
    await this.retrieve();
  }

  async arrived(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.succeeded;
    await ride.save();
    await this.retrieve();
  }

  async unRegister(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "UnRegister From Ride",
        columnSettings: () => [
          {
            caption: "Please Tell Us Why?",
            column: new StringColumn({}),
          },
        ],
        ok: async () => {
          ride.driverId.value = '';
          ride.status.value = RideStatus.waitingFor10DriverAccept;
          await ride.save();
          this.snakebar.info("Thank You! Waiting To See You Again")
          await this.retrieve();
        }
      },
    )
  }
}

