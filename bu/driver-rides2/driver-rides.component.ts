import { Component, OnDestroy, OnInit } from '@angular/core';
import { Column, Context, NumberColumn, ServerFunction, StringColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { DestroyHelper, MessageType, ServerEventsService } from '../../../server/server-events-service';
import { Utils } from '../../../shared/utils';
import { Ride, RideStatus } from '../../rides/ride';
import { rides4Driver, rides4DriverRow, Usher } from '../../usher/usher';
import { Driver } from '../driver';

@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.component.html',
  styleUrls: ['./driver-rides.component.scss']
})
export class DriverRidesComponent implements OnInit, OnDestroy {

  groupSameLocations: boolean = true;
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

  sendMessage(status: RideStatus) {
    DriverRidesComponent.sendMessage(this.driver.id.value, status);
  }
  @ServerFunction({ allowed: true })
  static async sendMessage(driverId: string, status: RideStatus) {

    // if (appSettings.allowPublishMessages.value) {
    if (false) {
      ServerEventsService.OnServerSendMessageToChannel(
        driverId,
        {
          type: MessageType.driverSendStatusToUsher,
          status: status,
          text: 'The message text'
        });
    }
  }

  async ngOnInit() {
    this.driver = await this.context.for(Driver).findFirst(
      d => d.userId.isEqualTo(this.context.user.id),
    );
    this.serverToday = await Utils.getServerDate();

    if (this.driver && this.driver.id && this.driver.id.value && this.driver.id.value.length > 0) {
      await this.retrieve();
    }
    else{
      this.snakebar.info("Your user NOT found, Please sign-up");
      //this.navigate.to("/signup");
    }
  }

  async onGroupSameLocations() {
    this.driverRegistered = [];
    this.driverSuggestions = [];
    console.log("onGroupSameLocations B: ", this.groupSameLocations)
    this.groupSameLocations = !this.groupSameLocations;
    console.log("onGroupSameLocations A: ", this.groupSameLocations)
    await this.retrieve();
  }

  async retrieve() {

    this.driverRegistered = await Usher.getRegisteredRidesForDriverGoupByDateAndPeriod(
      this.driver.id.value, this.groupSameLocations);

    console.log(this.driverRegistered);

    if (this.driverRegistered.length == 0) {
      // this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }

    this.driverSuggestions = await Usher.getSuggestedRidesForDriverGoupByDateAndPeriod(
      this.driver.id.value, this.groupSameLocations);

    console.log(this.driverSuggestions);

    if (this.driverSuggestions.length == 0) {
      // this.snakebar.info("Thank You! Found No Rides Suits Your Preffered Borders");
    }
  }

  async register(rideRow: rides4DriverRow) {

    let pass = Math.min(rideRow.passengers, this.driver.seats.value > 0 ? this.driver.seats.value : Number.MAX_VALUE);

    let driverSelected: Column[] = [
      new StringColumn({ caption: "I'm Available From Hour", defaultValue: this.driver.defaultFromTime.value }),
      new StringColumn({ caption: "I'm Available till Hour", defaultValue: this.driver.defaultToTime.value }),
      new NumberColumn({ caption: "Paasengers I can take", defaultValue: pass, validate: () => { } }),
      new StringColumn({ caption: "Remarks", defaultValue: this.driver.defaultFromTime.value }),
    ];
    this.context.openDialog(
      InputAreaComponent,
      x => x.args = {
        title: "Register To Ride",
        columnSettings: () => [
          driverSelected[0],
          driverSelected[1],
          driverSelected[2],
          driverSelected[3],
        ],
        ok: async () => {
          let rides: Ride[] = [];
          if (rideRow.groupByLocation) {
            let all = await this.context.for(Ride).find({
              where: r => r.id.isIn(...rideRow.ids),
              orderBy: r => [{ column: r.escortsCount, descending: true }],
            });

            let count = 0;
            for (const r of all) {
              //todo: find algoritem to get the max rides (1,2,3)=4seats=(1+2)|(3+1)
              let curPass = r.passengers();
              if (count + curPass <= driverSelected[2].value)//bigger than what driver wants.
              {
                rides.push(r);
                count += curPass;
              }
            }
          }
          else {
            rides.push(await this.context.for(Ride).findId(rideRow.id));
          }

          for (const r of rides) {
            r.driverId.value = this.driver.id.value;
            r.status.value = RideStatus.waitingForUsherApproove;
            await r.save();
          }
          this.snakebar.info("Thank You! We will contact you ASAP")
          await this.retrieve();
        }
      },
    )
  }

  async startDriving(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingForPickup;
    await ride.save();
    await this.retrieve();
  }

  async pickup(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingForArrived;
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
          ride.status.value = RideStatus.waitingForDriver;
          await ride.save();
          this.snakebar.info("Thank You! Waiting To See You Again")
          await this.retrieve();
        }
      },
    )
  }
}

