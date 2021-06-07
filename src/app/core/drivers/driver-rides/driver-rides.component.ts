import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction } from '@remult/core';
import { ride4Driver } from '../../../shared/types';
import { addDays, TODAY } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { Location } from '../../locations/location';
import { Patient } from '../../patients/patient';
import { Contact } from '../../patients/patient-contacts/contact';
import { PatientContactsComponent } from '../../patients/patient-contacts/patient-contacts.component';
import { Ride, RideStatus } from '../../rides/ride';
import { Driver } from '../driver';

@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.component.html',
  styleUrls: ['./driver-rides.component.scss']
})
export class DriverRidesComponent implements OnInit {

  rides: ride4Driver[];
  today = addDays(TODAY);

  constructor(private context: Context) {}

  async ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.rides = await DriverRidesComponent.retrieveDriverRides(this.context);
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveDriverRides(context?: Context) {
    var result: ride4Driver[] = [];

    let driver = await context.for(Driver).findFirst({
      where: d => d.userId.isEqualTo(context.user.id),
    });
    if (!(driver)) {
      throw 'Error - You are not register to use app';
    }

    let today = addDays(TODAY);
    for await (const ride of context.for(Ride).iterate({
      where: r => r.driverId.isEqualTo(driver.id)
        .and(r.date.isGreaterOrEqualTo(today))
        .and(r.status.isIn(...RideStatus.isInDriverWaitingStatuses)),
    })) {
      let from = (await context.for(Location).findId(ride.fid.value)).name.value;
      let to = (await context.for(Location).findId(ride.tid.value)).name.value;
      let pName = ride.isHasPatient() ? (await context.for(Patient).findId(ride.patientId.value)).name.value : "";
      let age = ride.isHasPatient() ? (await context.for(Patient).findId(ride.patientId.value)).age.value : undefined;
      let pMobile = ride.isHasPatient() ? (await context.for(Patient).findId(ride.patientId.value)).mobile.value : "";
      let contactsCount = await context.for(Contact).count(
        c => c.patientId.isEqualTo(ride.patientId),
      );
      let equipment: string[] = [];
      if (ride.isHasBabyChair) {
        equipment.push('child_friendly');
      }
      if (ride.isHasWheelchair) {
        equipment.push('accessible');
      }
      // if (ride.isHasExtraEquipment) {
      //   equipment.push('home_repair_service');
      // }
      console.log('---- ' + ride.passengers());
      let row = result.find(r => r.rId === ride.id.value);
      if (!(row)) {
        row = {
          rId: ride.id.value,
          pId: ride.patientId.value,
          dId: ride.isHasDriver() ? ride.driverId.value : '',
          fId: ride.fid.value,
          pName: pName,
          from: from,
          to: to,
          contactsCount: contactsCount,
          date: ride.date.value,
          // pickupTime: ride.pickupTime.value,
          visitTime: ride.visitTime.value,
          pickupTime: ride.pickupTime.value,
          passengers: ride.passengers(),
          age: age,
          equipment: equipment,
          pMobile: pMobile,
          shortCall: 's-call',
          whatsapp: 'wapp',
          companyPhone: 'c-phone',
          companyShortCall: 'c-s-call',
          companyWhatsapp: 'c-wapp',
          w4Accept: ride.isWaitingForAccept(),
          w4Start: ride.isWaitingForStart(),
          w4Pickup: ride.isWaitingForPickup(),
          w4Arrived: ride.isWaitingForArrived(),
          w4End: ride.isEnd(),
          dRemark: ride.dRemark.value,
          // status: ride.status.value,
        };
        result.push(row);
      }
    }

    // console.log(result)
    result.sort((r1, r2) => +r1.date - +r2.date);

    return result;
  }

  async openWaze(address: string) {
    console.log(`open waze to: ${address}`)
    // this.context.openDialog(YesNoQuestionComponent);
  }

  async openContacts(r: ride4Driver) {

    this.context.openDialog(PatientContactsComponent, sr => sr.args = {
      pid: r.pId,
    });
  }

  async accept(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingForStart;
    await ride.save();
    await this.refresh();
  }

  async drive(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingForPickup;
    await ride.save();
    await this.refresh();
  }

  async pickup(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.waitingForArrived;
    await ride.save();
    await this.refresh();
  }

  async arrived(rideId: string) {
    let ride = await this.context.for(Ride).findId(rideId);
    ride.status.value = RideStatus.succeeded;
    await ride.save();
    await this.refresh();
  }

}
