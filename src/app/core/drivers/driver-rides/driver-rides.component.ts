import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { ride4Driver, TODAY } from '../../../shared/types';
import { addDays } from '../../../shared/utils';
import { Roles } from '../../../users/roles';
import { Location } from '../../locations/location';
import { Contact } from '../../patients/contact';
import { Patient } from '../../patients/patient';
import { PatientContactsComponent } from '../../patients/patient-contacts/patient-contacts.component';
import { Ride, RideStatus } from '../../rides/ride';
import { Driver } from '../driver';
import { DriverRideProblemComponent } from '../driver-ride-problem/driver-ride-problem.component';

@Component({
  selector: 'app-driver-rides',
  templateUrl: './driver-rides.component.html',
  styleUrls: ['./driver-rides.component.scss']
})
export class DriverRidesComponent implements OnInit {

  rides: ride4Driver[];
  today = addDays(TODAY);

  constructor(private context: Context, private dialog: DialogService) { }

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
      where: d => d.uid.isEqualTo(context.user.id),
    });
    if (!(driver)) {
      throw 'Error - You are not register to use app';
    }

    let today = addDays(TODAY);
    for await (const ride of context.for(Ride).iterate({
      where: r => r.did.isEqualTo(driver.id)
        .and(r.date.isGreaterOrEqualTo(today))
        .and(r.status.isIn(...RideStatus.isDriverNeedToShowStatuses)),
    })) {
      let from = (await context.for(Location).findId(ride.fid.value)).name.value;
      let to = (await context.for(Location).findId(ride.tid.value)).name.value;
      let age = ride.isHasPatient() ? (await context.for(Patient).findId(ride.pid.value)).age.value : undefined;
      let pMobile = ride.isHasPatient() ? (await context.for(Patient).findId(ride.pid.value)).mobile.value : "";
      let contactsCount = await context.for(Contact).count(
        c => c.pid.isEqualTo(ride.pid),
      );
      let pName = '';
      let equipment: string[] = [];
      let p = ride.isHasPatient() ? (await context.for(Patient).findId(ride.pid.value)) : undefined;
      if (p) {
        pName = p.name.value;
        if (p.isHasBabyChair) {
          equipment.push('');
        }
        if (p.isHasWheelchair) {
          equipment.push('');
        }
      }
      let backSucceeded = await ride.isBackSucceeded();

      // console.log('---- ' + ride.passengers());
      let row = result.find(r => r.rId === ride.id.value);
      if (!(row)) {
        row = {
          rId: ride.id.value,
          pId: ride.pid.value,
          dId: ride.isHasDriver() ? ride.did.value : '',
          fId: ride.fid.value,
          pName: pName,
          from: from,
          to: to,
          contactsCount: contactsCount,
          date: ride.date.value,
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
          backSucceeded: backSucceeded
          // status: ride.status.value,
        };
        result.push(row);
      }
    }

    // console.log(result)
    result.sort((r1, r2) => +r1.date - +r2.date);

    return result;
  }

  async sendWapp(mobile: string, message: string = 'Hi Avishai') {
    window.open(`https://wa.me/${mobile}?text=${encodeURI(message)}`, '_blank');
  }

  async openWaze(address: string) {
    window.open(`waze://?q=${encodeURI(address)}&navigate=yes`);
    // window.open('waze://?ll=' + this.address.getGeocodeInformation().getlonglat() + "&q=" + encodeURI(this.address.value) + '&navigate=yes');
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
    ride.status.value = RideStatus.w4_Start;
    await ride.save();
    await this.refresh();
  }

  async drive(r: ride4Driver) {
    let ride = await this.context.for(Ride).findId(r.rId);

    if (ride) {
      ride.status.value = RideStatus.w4_Pickup;
      await ride.save();
      await this.refresh();
      await this.openWaze(r.from);
    }
  }

  async pickup(r: ride4Driver) {
    let ride = await this.context.for(Ride).findId(r.rId);
    if (ride) {
      ride.status.value = RideStatus.w4_Arrived;
      await ride.save();
      await this.refresh();
      await this.openWaze(r.to);
    }
  }

  async problem(r: ride4Driver) {
    let status = await this.context.openDialog(DriverRideProblemComponent,
      dlg => dlg.args = { rid: r.rId },
      dlg => dlg && dlg.args.status ? dlg.args.status : undefined);
    if (status) {
      await this.refresh();
    }
  }
 
  async arrived(r: ride4Driver) {
    let ride = await this.context.for(Ride).findId(r.rId);
    ride.status.value = RideStatus.Succeeded;
    await ride.save();
    // if (ride.isBackRide.value) {

    // }
    // else {
    //   let back: Ride;
    //   if (!(ride.hadBackRide())) {
    //     back = await ride.createBackRide();
    //     ride.backId.value = back.id.value;
    //     await ride.save();
    //   }
    //   else {
    //     back = await this.context.for(Ride).findId(ride.backId.value);
    //   }
    //   back.status.value = RideStatus.InHospital;
    //   await back.save();
    // }
    await this.refresh();
    let driver = await this.context.for(Driver).findFirst({
      where: d => d.uid.isEqualTo(this.context.user.id),
    });
    let city = '';
    if (driver) {
      city = driver.city.value;
    }
    let openWaze = city && city.length > 0;
 
    let message = `THANK YOU! 
      F.Y.I: This Ride has removed to your History. 
      There you can set the time you got back home, 
      and by that the system will calculate the TOTAL distances for your refund ! `;
    if (openWaze) {
      message = message + `Now waze will navigate you to: '${city}'`;
    }

    await this.dialog.error(message);

    if (openWaze) {
      await this.openWaze(city);
    }
  }

}
