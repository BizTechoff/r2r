import { ColumnSettings, DateTimeColumn, StringColumn } from "@remult/core";
import { RideStatus } from "../core/rides/ride";

export class changeDate extends DateTimeColumn {
  readonly = true;
};

export class TimeColumn extends StringColumn {
  constructor(options?: ColumnSettings<string>) {
    super({
      inputType: 'time',
      defaultValue: '00:00',
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
    return this.value.length == 0 || this.value === '00:00';
  }
}

export interface UsherRideRow {
  id: string,
  date: Date,
  visitTime: string,
  from: string,
  to: string,
  passengers: number,
  days: number,
  status: RideStatus,
  statusDate: Date,
  pid: string,
  pName?: string,
  pAge?: number,
  pMobile?: string,
  did: string,
  dName?: string,
  dMobile?: string,
  icons?: string[],
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
  dRemark: string,
  reason?: string,
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
  w4Driver: number,
  w4Accept: number,
  ids?: string[],
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

export interface ride4UsherApprove {
  id: string,
  patientId: string,
  driverId?: string,
  selected: boolean,
  from: string,
  to: string,
  driver: string,
  dMobile: string,
  visitTime: string,
  passengers: number,
  patient: string,
  status: string,
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
  passengers: number,
  patient: string,
  rid: string,
  status: RideStatus,
  freeSeats?: number;
  w4Accept: boolean,
  w4Start: boolean,
  w4Pickup: boolean,
  w4Arrived: boolean,
  w4End: boolean,
};

export interface usherDriversResponse {
  driverId: string,
  display: string,
};
