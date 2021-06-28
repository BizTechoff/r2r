import { Component, OnInit } from '@angular/core';
import { Context, ServerFunction } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { ride4Driver, TimeColumn } from '../../../shared/types';
import { Roles } from '../../../users/roles';
import { Location, LocationType } from '../../locations/location';
import { Contact } from '../../patients/contact';
import { Patient } from '../../patients/patient';
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

  constructor(private context: Context, private dialog: DialogService) { }

  async ngOnInit() {
    this.rides = await DriverHistoryComponent.retrieveDriverHistory(this.context);
  }

  @ServerFunction({ allowed: Roles.driver })
  static async retrieveDriverHistory(context?: Context) {
    var result: ride4Driver[] = [];

    let driver = await context.for(Driver).findFirst({
      where: d => d.uid.isEqualTo(context.user.id),
    });
    if (!(driver)) {
      throw 'Error - You are not register to use app';
    }

    for await (const ride of context.for(Ride).iterate({
      where: r => r.did.isEqualTo(driver.id)
        .and(r.status.isNotIn(...RideStatus.isDriverNeedToShowStatuses)),
    })) {
      let f = (await context.for(Location).findId(ride.fid.value));
      let from = f.name.value;
      let isFromBorder = f.type.value === LocationType.border;
      
      let t = (await context.for(Location).findId(ride.tid.value));
      let to = t.name.value;
      let isToBorder = t.type.value === LocationType.border;
      
      let age = ride.isHasPatient() ? (await context.for(Patient).findId(ride.pid.value)).age.value : undefined;
      let mobile = ride.isHasPatient() ? (await context.for(Patient).findId(ride.pid.value)).mobile.value : "";
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
      let originSucceeded = await ride.isOriginSucceeded();

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
          originSucceeded: originSucceeded,
          fromIsBorder: isFromBorder,
          toIsBorder: isToBorder
        };
        result.push(row);
      }
    } 

    // console.log(result)
    result.sort((r1, r2) => +r1.date - +r2.date);

    return result;
  }
  
  async setEndTime(r: ride4Driver) {
    let ride = await this.context.for(Ride).findId(r.rId);
    if (ride) {
      let date = ride.date.value.toLocaleDateString("he-il");
      let time = new TimeColumn({caption:'When You END Your Ride (back home/work)?', defaultValue: ride.dEnd.value });
      this.context.openDialog(InputAreaComponent, i => i.args = {
        title: `You started: ${ride.dStart.value}, pickedup: ${ride.dPickup.value}, arrived: ${ride.dArrived.value}, end: ${ride.dEnd.value}`,
        columnSettings: () => [
          time
        ],
        validate: async () => {
          if (time.isEmpty()) {
            time.validationError = 'Time can not be empty';
            throw time.validationError;
          }
          if (time.value < ride.dArrived.value) {
            time.validationError = 'Time should be more then ' + ride.dArrived.value;
            throw time.validationError;
          }
        },
        ok: async () => {
          ride.dEnd.value = time.value;
          await ride.save();
          this.dialog.info(`TX!! your refund will recalculte soon`);
        }
      });
    }
  }

  async openContacts(r: ride4Driver) {

    this.context.openDialog(PatientContactsComponent, sr => sr.args = {
      pid: r.pId,
    });
  }

}
