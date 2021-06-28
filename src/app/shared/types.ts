import { ColumnSettings, DateTimeColumn, Filter, StringColumn } from "@remult/core";
import { RideStatus } from "../core/rides/ride";


export const TODAY: number = 0;
export const PickupTimePrevHours: number = -2;
export const MinPickupBorder: string = '05:00';
export const MaxPickupBorder: string = '19:00';
export const MinPickupHospital: string = '10:00';
export const MaxPickupHospital: string = '18:00';
export const IsDevMode: boolean = true;
export const FILTER_IGNORE: Filter = new Filter(x => { return true; });
export const NOT_FOUND_DAYS: number = -999999;
export const SMS_CHANNEL_OPENED: boolean = false;

export class changeDate extends DateTimeColumn {
  readonly = true;
};

export class MobileColumn extends StringColumn {
  constructor(options?: ColumnSettings<string>) {
    super({
      dataControlSettings: () => ({
        click: () => window.open('tel:' + this.value),
        // allowClick: () => !!this.value,
        clickIcon: 'phone',
        inputType: 'tel'
      }),
      ...options
    });
  }
}

export class TimeColumn extends StringColumn {
  static Empty: string = '00:00';
  constructor(options?: ColumnSettings<string>) {
    super({
      inputType: 'time',
      defaultValue: TimeColumn.Empty,
    }, options);
  }

  setHour(hour: number) {
    if (hour >= 0 && hour <= 23) {
      if (this.isEmpty) {
        this.value = ('' + hour).padStart(2, '0');
      }
      else {
        let split = this.value.split(':');
        if (split && split.length > 1) {
          this.value = ('' + hour).padStart(2, '0') + ':' + split[1];
        }
      }
    }
  }

  isEmpty() {
    return !this.value || this.value.length === 0 || this.value === TimeColumn.Empty;
  }
}import { Directive, Input } from "@angular/core";
@Directive({
    selector:"[localVariables]",
    exportAs:"localVariables"
})
export class LocalVariables {
    @Input("localVariables") set localVariables( struct: any ) {
        if ( typeof struct === "object" ) {
            for( var variableName in struct ) {
                this[variableName] = struct[variableName];
            }
        }
    }
    constructor( ) {
    }
}

export interface driver4UsherSuggest {
  did: string,
  freeSeats: number,
  lastRideDays: number,
  lastCallDays: number,
  reason: string,
  priority: number,
  // Extras from driver
  name: string,
  mobile: string,
  home: string,
  seats: number,
  freeze?: Date
};

export interface ride4UsherRideRegister {
  rgId: string,
  date: Date,
  fId: string,
  tId: string,
  from: string,
  to: string,
  // pass: number,
  registeredCount: number,
  dFromHour?: Date,
  dToHour?: Date,
  dPass?: number,
  selected: boolean,
};

export interface ride4DriverRideRegister {
  rid: string,
  rrid: string,
  dId?: string,
  date: Date,
  fId: string,
  tId: string,
  from: string,
  to: string,
  pass: number,
  isRegistered: boolean,
  dFromHour?: string,
  dToHour?: string,
  dPass?: number,
  pickupTime?: string,
  visitTime?: string,
  immediate: boolean,
  dRemark: string,
  reason?: string,
  whenPickup: string
};

export interface ride4Driver {
  rId: string,
  pId: string,
  dId: string,
  fId: string,
  pName: string,
  pMobile: string,
  from: string,
  to: string,
  contactsCount: number,
  date: Date,//+Time
  pickupTime: string,
  visitTime: string,
  passengers: number,
  age: number,
  equipment: string[],
  shortCall: string,
  whatsapp: string,
  companyPhone: string,
  companyShortCall: string,
  companyWhatsapp: string,
  status?: RideStatus,
  w4Accept: boolean,
  w4Start: boolean,
  w4Pickup: boolean,
  w4Arrived: boolean,
  w4End: boolean,
  dRemark: string,
  originSucceeded: boolean
};
 
export interface ride4Usher {

  key: string,
  fromIsBorder: boolean;
  toIsBorder: boolean;
  fromId: string,
  toId: string,
  from: string,
  to: string,
  passengers: number,
  ridesCount: number,
  inProgress: number,
  registers: number,
  problem: number,
  w4Driver: number,
  w4Accept: number,
  inHospital: number,
  created: Date,
  ids?: string[]
};

export interface driver4Usher {

  id: string,
  name: boolean;
  mobile: boolean;
  home: string,
  last: string,
  from: string,
  to: string,
  passengers: number,
  ridesCount: number,
  inProgress: number,
  needDriver: number,
  needApprove: number,
  ids?: string[],
};

export interface ride4UsherSetDriver {
  id: string,
  patientId: string,
  driverId?: string,
  selected: boolean,
  from: string,
  to: string,
  driver: string,
  dMobile: string,
  visitTime: string,
  pickupTime: string,
  passengers: number,
  patient: string,
  rid: string,
  status: RideStatus,
  freeSeats?: number;
  w4Accept: boolean,
  w4Start: boolean,
  w4Pickup: boolean,
  w4Arrived: boolean,
  notActiveYet: boolean,
  dFeedback?: string
};
