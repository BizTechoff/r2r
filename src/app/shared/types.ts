import { DateTimeColumn } from "@remult/core";

export class changeDate extends DateTimeColumn {
  readonly = true;
};

export interface getRideList4UsherParams {
  date: Date,
  fromId?: string,
  toId?: string,
};

export interface driver4UsherSuggest {
  id: string,
  name: string,
  mobile: string,
  home: string,
  lastRideDays: number,
  reason: string,
  lastCallDays: number,
};

export interface ride4UsherRideRegister {
  rgId: string,
  date: Date,
  fId: string,
  tId: string,
  from: string,
  to: string,
  pass: number,
  registeredCount: number,
  dFromHour?: Date,
  dToHour?: Date,
  dPass?: number,
  selected: boolean,
};

export interface ride4DriverRideRegister {
  rgId: string,
  dRegId?: string,
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
  time: Date,
  visitTime: Date,
  passengers: number,
  age: number,
  equipment: string[],
  shortCall: string,
  whatsapp: string,
  companyPhone: string,
  companyShortCall: string,
  companyWhatsapp: string,
  // status: RideStatus,
  w4Start: boolean,
  w4Pickup: boolean,
  w4Arrived: boolean,
  w4End: boolean,
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
  visitTime: Date,
  passengers: number,
  patient: string,
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
  visitTime: Date,
  passengers: number,
  patient: string,
};

export interface usherDriversResponse {
  driverId: string,
  display: string,
};
