import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction } from '@remult/core';
import { ride4Driver } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Location } from '../../locations/location';
import { Patient } from '../../patients/patient';
import { Contact } from '../../patients/patient-contacts/contact';
import { PatientContactsComponent } from '../../patients/patient-contacts/patient-contacts.component';
import { Ride, RideStatus } from '../../rides/ride';
import { Driver } from '../driver';
 
@Component({
  selector: 'app-driver-history',
  templateUrl: './driver-history.component.html',
  styleUrls: ['./driver-history.component.scss']
})
export class DriverHistoryComponent implements OnInit {

  rides: ride4Driver[];

  constructor(private context: Context) { }

  async ngOnInit() {
    this.rides = await DriverHistoryComponent.retrieveDriverHistory(this.context);
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveDriverHistory(context?: Context) {
    var result: ride4Driver[] = [];
 
    let driver = await context.for(Driver).findFirst({
      where: d => d.userId.isEqualTo(context.user.id),
    });
    if (!(driver)) {
      throw 'Error - You are not register to use app';
    }

    for await (const ride of context.for(Ride).iterate({
      where: r => r.did.isEqualTo(driver.id)
        .and(r.status.isNotIn(...RideStatus.isInDriverWaitingStatuses)),
    })) {
      let from = (await context.for(Location).findId(ride.fid.value)).name.value;
      let to = (await context.for(Location).findId(ride.tid.value)).name.value;
      let pName = ride.isHasPatient() ? (await context.for(Patient).findId(ride.pid.value)).name.value : "";
      let age = ride.isHasPatient() ? (await context.for(Patient).findId(ride.pid.value)).age.value : undefined;
      let mobile = ride.isHasPatient() ? (await context.for(Patient).findId(ride.pid.value)).mobile.value : "";
      let contactsCount = await context.for(Contact).count(
        c => c.patientId.isEqualTo(ride.pid),
      );
      let equipment: string[] = [];
      if (ride.isHasBabyChair) {
        equipment.push('');
      }
      if (ride.isHasWheelchair) {
        equipment.push('');
      }
      // if (ride.isHasExtraEquipment) {
      //   equipment.push('');
      // }

      let row = result.find(r => r.rId === ride.id.value);
      if (!(row)) {
        row = {
          rId: ride.id.value,
          pId: ride.pid.value,
          dId: ride.isHasDriver()? ride.did.value: '',
          fId: ride.fid.value,
          pName: pName,
          from: from,
          to: to,
          contactsCount: contactsCount,
          date: ride.date.value,
          pickupTime: ride.pickupTime.value,
          visitTime: ride.visitTime.value,
          passengers: ride.passengers(),
          age: age,
          equipment: equipment,
          pMobile: mobile,
          shortCall: 's-call',
          whatsapp: 'wapp',
          companyPhone: 'c-phone',
          companyShortCall: 'c-s-call',
          companyWhatsapp: 'c-wapp',
          status: ride.status.value,
          w4Accept: ride.isWaitingForAccept(),
          w4Start: ride.isWaitingForStart(),
          w4Pickup: ride.isWaitingForPickup(),
          w4Arrived: ride.isWaitingForArrived(),
          w4End: ride.isEnd(),
          dRemark: ride.dRemark.value,
        };
        result.push(row);
      }
    } 

    // console.log(result)
    result.sort((r1, r2) => +r1.date - +r2.date);

    return result;
  }

  async openContacts(r:ride4Driver){
     
    this.context.openDialog(PatientContactsComponent, sr => sr.args = {
      pid: r.pId,
    });
  }

}
