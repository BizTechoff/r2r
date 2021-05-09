import { DateTimeColumn } from "@remult/core";

export class changeDate extends DateTimeColumn {
  readonly = true;
}

// export interface usherDriversRequest{
//   rideId:string,
//   locationId:string,
//   dayOfWeek:DayOfWeek,
//   dayPeriod:DayPeriod,
//   date: Date
// };


export interface getRideList4UsherParams{
  date: Date,
  fromId?:string,
  toId?:string,
}

export interface ride4Usher {

  key: string,
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
}

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
}

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
}

export interface usherDriversResponse {
  driverId: string,
  display: string,
};

