import { DateTimeColumn } from "@remult/core";
import { DayOfWeek, DayPeriod } from "../core/drivers/driverPrefSchedule";

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

export interface usherDriversResponse{
  driverId:string,
  display:string,
};
