import { Context, ServerContext, SqlDatabase } from '@remult/core';
import * as fs from 'fs';
import * as fetch from 'node-fetch';
import { ApplicationSettings } from '../core/application-settings/applicationSettings';
import { Driver } from '../core/drivers/driver';
import { DriverPrefs } from '../core/drivers/driverPrefs';
import { Location, LocationType } from '../core/locations/location';
import { Patient } from '../core/patients/patient';
import { Ride, RideStatus } from '../core/rides/ride';
import { Users } from '../users/users';

let volunteersFolder = "c:/r2r/volunteers";
let ridersFolder = "c:/r2r/rides";

var counter = 0;

export async function importDataNew(db: SqlDatabase, fresh = false) {

    if (fresh) {
        await importRidesToFiles(ridersFolder);
        await importDriversToFiles(volunteersFolder);
    }

    counter = 0;
    console.log("starting import");
    var context = new ServerContext(db);

    await seed(context);

    var rides = fs.readdirSync(ridersFolder);
    console.log("rides.length=" + rides.length);

    for (const id of rides) {
        ++counter;

        let fileName = `${ridersFolder}/${id}`;
        var r = JSON.parse(fs.readFileSync(fileName).toString());

        let status: string = r.Status;
        if (status.trim() == 'נמחקה') {
            console.log('נמחקה');
            continue;
        }

        await createFromRideRecordNew(r, context);

    }

    //console.log("list tables with data");
    console.log(`settings: ${await context.for(ApplicationSettings).count()} rows`);
    console.log(`locations: ${await context.for(Location).count()} rows`);
    console.log(`users: ${await context.for(Users).count()} rows`);
    console.log(`drivers: ${await context.for(Driver).count()} rows`);
    console.log(`driversPrefs: ${await context.for(DriverPrefs).count()} rows`);
    console.log(`patients: ${await context.for(Patient).count()} rows`);
    console.log(`rides: ${await context.for(Ride).count()} rows`);

    console.log("finished import");
}

async function seed(context?: Context) {

    // Create admin user if not exists.
    let count = await context.for(ApplicationSettings).count();
    if (count == 0) {
        let a = context.for(ApplicationSettings).create();
        await a.save();
        console.log("created ApplicationSettings");
    }

    // Create admin user if not exists.
    count = await context.for(Users).count();
    if (count == 0) {
        let u = context.for(Users).create();
        u.isAdmin.value = true;
        u.name.value = "admin";
        await u.create("Q1w2e3r4");
        console.log("created admin");
    }
}

async function createFromRideRecordNew(record: any, context?: Context) {
    // console.log("createFromRideRecordNew called");
    let fromId = await findOrCreateLocationNew(record.Origin, context);
    let toId = await findOrCreateLocationNew(record.Destination, context);
    let patientId = await findOrCreatePatientNew(record.Pat, context);
    let userId = await findOrCreateUserNew(record.Drivers[0], context);// user auto-create driver
    if (!(userId && userId.length > 0)) {
        console.log("userId null");
        return;
    }
    let driverId = await findOrCreateDriverNew(record.Drivers[0], userId, context);
    if (!(driverId && driverId.length > 0)) {
        console.log("driverId null");
        return;
    }
    let driverPrefIds = await findOrCreateDriverPrefsNew(record.Drivers[0], driverId, context);
    let rideId = await findOrCreateRideNew(record, driverId, patientId, fromId, toId, context);
}

async function findOrCreateLocationNew(locationRecord: any, context: Context) {
    let name = locationRecord.EnglishName;
    if (name) {
        name = name.trim();
    }
    let location = await context.for(Location).findOrCreate({
        where: l => l.name.isEqualTo(name),
    });
    location.type.value = isBorder(name) ? LocationType.border : LocationType.hospital;
    await location.save();
    return location.id.value;
}

async function findOrCreatePatientNew(patientRecord: any, context: Context) {
    let patient = await context.for(Patient).findOrCreate({
        where: l => l.name.isEqualTo(patientRecord.EnglishName),
    });
    patient.hebName.value = patientRecord.DisplayName;
    patient.mobile.value = patientRecord.CellPhone;
    // patient.idNumber.value = patientRecord
    try { await patient.save(); }
    catch (error) {
        console.log("error");
        console.log(error);
    }
    return patient.id.value;
}

async function findOrCreateUserNew(driverRecord: any, context: Context) {
    let result = "";
    let driverEntityRecord = await getDriverEntityRecord(
        driverRecord.DisplayName
    );

    let driverName = driverEntityRecord.EnglishName;
    if (!(driverName && driverName.length > 0)) {
        driverName = driverEntityRecord.DisplayName;
    }
    if (!(driverName && driverName.length > 0)) {
        driverName = "No_Driver_Name_" + counter;
    }
    let user = await context.for(Users).findOrCreate({
        where: u => u.name.isEqualTo(driverName),
    });
    if (user.isNew()) {// first driver-row is taken.
        let mobile = driverEntityRecord.CellPhone;
        user.mobile.value = mobile;
        user.name.value = driverName;
        user.isDriver.value = true;
        user.createDate.value = new Date();
        await user.create(/*password:*/ mobile);
    }

    result = user.id.value;

    return result;
}

async function findOrCreateDriverNew(driverRecord: any, userId: string, context: Context) {
    let result = "";
    // console.log(driverRecord.DisplayName);
    let driverEntityRecord = await getDriverEntityRecord(
        driverRecord.DisplayName
    );

    let driverName = driverEntityRecord.EnglishName;
    if (!(driverName && driverName.length > 0)) {
        driverName = driverEntityRecord.DisplayName;
    }
    if (!(driverName && driverName.length > 0)) {
        driverName = "No_Driver_Name_" + counter;
    }
    if (driverName && driverName.length > 0) {
        let driver = await context.for(Driver).findOrCreate({
            // where: l => l.userId.isEqualTo(userId),
            where: d => d.name.isEqualTo(driverName),
        });
        driver.userId.value = userId;
        driver.name.value = driverName;
        driver.hebName.value = driverEntityRecord.DisplayName;
        driver.mobile.value = driverEntityRecord.CellPhone;
        driver.seats.value = driverEntityRecord.AvailableSeats;
        driver.email.value = driverEntityRecord.Email;
        driver.idNumber.value = driverEntityRecord.VolunteerIdentity;
        driver.birthDate.value = new Date(driverEntityRecord.BirthDate);
        driver.city.value = driverEntityRecord.City;
        driver.address.value = driverEntityRecord.Address;
        try {
            await driver.save();
            result = driver.id.value;
        }
        catch (error) {
            console.log(`${driverName}`);
            console.log(error);
        }
    }
    else {
        console.log(`no driver name`);
    }
    return result;
}

async function findOrCreateDriverPrefsNew(driverRecord: any, driverId: string, context: Context) {

    let driverEntityRecord = await getDriverEntityRecord(
        driverRecord.DisplayName
    ); 

    let result = [];
    if (driverEntityRecord.PrefTime && driverEntityRecord.PrefTime.length > 0) {
        if (driverEntityRecord.PrefLocation && driverEntityRecord.PrefLocation.length > 0) {
            console.log(driverEntityRecord.PrefLocation);
        }
        // for (const time of driverEntityRecord.PrefTime) {
        //     let day = DriverPrefs.getDayOfWeek(time[0]);
        //     let period = DriverPrefs.getDayPeriod(time[1]);

        //     let prefs = await context.for(DriverPrefs).find({
        //         where: p => p.dayOfWeek.isEqualTo(day)
        //             .and(p.dayPeriod.isEqualTo(period))
        //             .and(p.driverId.isEqualTo(driverId)),
        //     });
        //     if (prefs && prefs.length > 0) {
        //         console.log(`Duplicate Prefs for driver: ${driverId}`)
        //         return;
        //     }
        //     let newPref = context.for(DriverPrefs).create();
        //     newPref.driverId.value = driverId;
        //     newPref.dayOfWeek.value = day;
        //     newPref.dayPeriod.value = period;
        //     await newPref.save();
        //     result.push(newPref.id.value);
        // }
    }
    return result;
}

async function findOrCreateRideNew(rideRecord: any, driverId: string, patientId: string, fromId: string, toId: string, context: Context) {
    // try{
    let ride = context.for(Ride).create();
    ride.importRideNum.value = rideRecord.RideNum;
    ride.driverId.value = driverId;
    ride.patientId.value = patientId;
    ride.fromLocation.value = fromId;
    ride.toLocation.value = toId;
    ride.date.value = toDate(rideRecord.Date);
    ride.dayOfWeek.value = DriverPrefs.getDayOfWeek((ride.date.value.getDay() + 1));
    ride.dayPeriod.value = DriverPrefs.getDayPeriod(ride.date.value.getHours() > 12 ? "afternoon" : "morning");
 
    ride.status.value = RideStatus.waitingForDriver;
    
    if (rideRecord.Statuses) {
        for (const st of rideRecord.Statuses) {
            switch (st) {
                case "ממתינה לשיבוץ": {
                    ride.status.value = RideStatus.waitingForDriver;
                    break;
                }
                case "שובץ נהג": {
                    ride.status.value = RideStatus.waitingForStart;
                    break;
                }
                case "אספתי את החולה": {
                    ride.status.value = RideStatus.waitingForArrived;
                    break;
                }
                case "הגענו ליעד": {
                    ride.status.value = RideStatus.succeeded;
                    break;
                }
            }
        }
    }

    // console.log(rideRecord.RideNum);
    // console.log(ride);
    await ride.save();
    return ride.id.value;
    // }catch(error){
    //     console.log("error on RideNum: " + rideRecord.RideNum);
    // }
}


async function getDriverEntityRecord(fileDriverHebName: string) {
    if (fileDriverHebName) {
        // console.log(fileDriverHebName);
        var volunteers = fs.readdirSync(volunteersFolder);
        if (volunteers) {
            let fileName = fileDriverHebName + ".json";
            if (volunteers.includes(fileName)) {
                let fullPath = `${volunteersFolder}/${fileName}`;
                var person = JSON.parse(fs.readFileSync(fullPath).toString());
                return person;
            }
        }
    }
}

async function importRidesToFiles(folderName: string) {
    let r = await get('GetRidePatViewByTimeFilter', { from: 7, until: 1 });
    for (const v of r) {
        let fileName = `${folderName}/${v.DisplayName}.json`;
        if (fs.existsSync(fileName)) {
            let one = await get('getVolunteer', { displayName: v.DisplayName });
            fs.writeFileSync(fileName, JSON.stringify(one, undefined, 2));
        }
    }
}

async function importDriversToFiles(folderName: string) {
    let r = await get('GetRidePatViewByTimeFilter', { from: 7, until: 1 });
    for (const v of r) {
        let fileName = `${folderName}/${v.DisplayName}.json`;
        if (!(fs.existsSync(fileName))) {
            let one = await get('getVolunteer', { displayName: v.DisplayName });
            fs.writeFileSync(fileName, JSON.stringify(one, undefined, 2));
        }
    }
}

async function get(url: string, body: any) {

    let r = await fetch.default("http://40.117.122.242/Prod/Road%20to%20Recovery/pages/WebService.asmx/" + url, {
        "headers": {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
            "content-type": "application/json; charset=UTF-8",
            "x-requested-with": "XMLHttpRequest",
            "cookie": "ASP.NET_SessionId=10qyz3ljglc2f3xatirvplzx; username=0546687991"
        },
        //  "referrer": "http://40.117.122.242/Prod/Road%20to%20Recovery/pages/volunteerForm.html",
        //   "referrerPolicy": "strict-origin-when-cross-origin",
        "body": JSON.stringify(body),
        "method": "POST",
        //      "mode": "cors"
    });
    return JSON.parse((await r.json()).d);
}

function toDate(date: string) {

    let num = date;
    if (num.includes("(")) {
        num = date.slice(date.indexOf("(") + 1, date.indexOf(")"));
    }
    let dint = Number.parseInt(num);
    return new Date(dint);
}


function camelize(str: string) {
    let result = str;
    if (str && str.length > 0) {
        result = str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
            if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
            index === 0 ? match.toLowerCase() : match.toUpperCase();
            // index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
    }
    return result;
}

function isBorder(name: string) {

    return borders.includes(name.trim().toLocaleLowerCase());

}

let borders: string[] = [];
{
    borders.push(`Baqa El Garbia start`.trim().toLocaleLowerCase());
    borders.push(`pardes hana`.trim().toLocaleLowerCase());
    borders.push(`Shaare Zedec`.trim().toLocaleLowerCase());
    borders.push(`Erez`.trim().toLocaleLowerCase());
    borders.push(`Husan`.trim().toLocaleLowerCase());
    borders.push(`Eliyahu`.trim().toLocaleLowerCase());
    borders.push(`Sha'ar Efraim`.trim().toLocaleLowerCase());
    borders.push(`sde hemed`.trim().toLocaleLowerCase());
    borders.push(`Macabim`.trim().toLocaleLowerCase());
    borders.push(`Reihan`.trim().toLocaleLowerCase());
    borders.push(`Tarkumia`.trim().toLocaleLowerCase());
    borders.push(`Glilot`.trim().toLocaleLowerCase());
    borders.push(`ajenda`.trim().toLocaleLowerCase());
    borders.push(`Na'alin`.trim().toLocaleLowerCase());
    borders.push(`Bethlehem`.trim().toLocaleLowerCase());
    borders.push(`Eyal`.trim().toLocaleLowerCase());
};