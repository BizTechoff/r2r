import { DateTimeColumn } from "@remult/core";
import { RideStatus } from "../core/rides/ride";

export class changeDate extends DateTimeColumn {
  readonly = true;
};

export interface getRideList4UsherParams {
  date: Date,
  fromId?: string,
  toId?: string,
};

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
  rId: string,
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
  pickupTime?:string,
  dRemark:string,
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
  dRemark:string,
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
  freeSeats?:number;
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
