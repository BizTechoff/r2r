import { Context, ServerContext, SqlDatabase } from '@remult/core';
import * as fs from 'fs';
import * as fetch from 'node-fetch';
import { Driver } from '../core/drivers/driver';
import { DriverPrefs } from '../core/drivers/driverPrefs';
import { Location, LocationType } from '../core/locations/location';
import { Patient } from '../core/patients/patient';
import { Ride } from '../core/rides/ride';
import { Users } from '../users/users';

let volunteersFolder = "c:/r2r/volunteers";
let ridersFolder = "c:/r2r/rides";

export async function importDataNew(db: SqlDatabase, fresh = false) {

    console.log("starting import");
    var context = new ServerContext(db);

    var rides = fs.readdirSync(ridersFolder);
    console.log("rides.length=" + rides.length);
    for (const id of rides) {
        let fileName = `${ridersFolder}/${id}`;
        var r = JSON.parse(fs.readFileSync(fileName).toString());

        let status: string = r.Status;
        if (status.trim() == 'נמחקה') {
            continue;
        }

        await createFromRideRecordNew(r, context);
    }
    console.log("finished import");
}

async function createFromRideRecordNew(record: any, context?: Context) {
    let fromId = await createLocationNew(record.Origin, context);
    let toId = await createLocationNew(record.Destination, context);
    let patientId = await createPatientNew(record.Pat, context);
    let userId = undefined;// await createUserNew(record.Drivers[0], context);// user auto-create driver
    let driverId = await createDriverNew(record.Drivers[0], userId, context);
    let driverPrefIds = await createDriverPrefsNew(record.Drivers[0], driverId, context);
    let rideId = await createRideNew(record, driverId, patientId, fromId, toId, context);
}

async function createLocationNew(locationRecord: any, context: Context) {
    let location = await context.for(Location).findOrCreate({
        where: l => l.name.isEqualTo(locationRecord.EnglishName),
    });
    location.type.value = LocationType.border;
    await location.save();
    return location.id.value;
}

async function createPatientNew(patientRecord: any, context: Context) {
    let patient = await context.for(Patient).findOrCreate({
        where: l => l.name.isEqualTo(patientRecord.EnglishName),
    });
    patient.hebName.value = patientRecord.DisplayName;
    patient.mobile.value = patientRecord.CellPhone;
    // patient.idNumber.value = patientRecord
    await patient.save();
    return patient.id.value;
}

async function createUserNew(driverRecord: any, context: Context) {
    // console.log(driverRecord.DisplayName);
    let driverEntityRecord = await getDriverEntityRecord(
        driverRecord.DisplayName
    );
    if (driverEntityRecord.EnglishName && driverEntityRecord.EnglishName.length > 0) {
        let user = await context.for(Users).findOrCreate({
            where: l => l.name.isEqualTo(driverEntityRecord.EnglishName),
        });

        // let user = await context.for(Users).create();
        user.mobile.value = driverEntityRecord.CellPhone;
        user.name.value = driverEntityRecord.EnglishName;
        user.isDriver.value = true;
        user.createDate.value = new Date();
        await user.create(driverEntityRecord.CellPhone);
        return user.id.value;
    }
}

async function createDriverNew(driverRecord: any, userId: string, context: Context) {
    // console.log(driverRecord.DisplayName);
    let driverEntityRecord = await getDriverEntityRecord(
        driverRecord.DisplayName
    );

    let driver = await context.for(Driver).findOrCreate({
        // where: l => l.userId.isEqualTo(userId),
        where: l => l.name.isEqualTo(driverEntityRecord.EnglishName),
    });
    driver.userId.value = userId;
    driver.name.value = driverEntityRecord.EnglishName;
    driver.hebName.value = driverEntityRecord.DisplayName;
    driver.mobile.value = driverEntityRecord.CellPhone;
    driver.seats.value = driverEntityRecord.AvailableSeats;
    driver.email.value = driverEntityRecord.Email;
    driver.idNumber.value = driverEntityRecord.VolunteerIdentity;
    driver.birthDate.value = new Date(driverEntityRecord.BirthDate);
    driver.city.value = driverEntityRecord.City;
    driver.address.value = driverEntityRecord.Address;
    await driver.save();
    return driver.id.value;
}

async function createDriverPrefsNew(driverRecord: any, driverId: string, context: Context) {

    let driverEntityRecord = await getDriverEntityRecord(
        driverRecord.DisplayName
    );

    let result = [];
    if (driverEntityRecord.PrefTime && driverEntityRecord.PrefTime.length > 0) {
        for (const time of driverEntityRecord.PrefTime) {
            let day = DriverPrefs.getDayOfWeek(time[0]);
            let period = DriverPrefs.getDayPeriod(time[1]);

            let prefs = await context.for(DriverPrefs).find({
                where: p => p.dayOfWeek.isEqualTo(day)
                    .and(p.dayPeriod.isEqualTo(period))
                    .and(p.driverId.isEqualTo(driverId)),
            });
            if (prefs && prefs.length > 0) {
                console.log(`Duplicate Prefs for driver: ${driverId}`)
                return;
            }
            let newPref = await context.for(DriverPrefs).create();
            newPref.driverId.value = driverId;
            newPref.dayOfWeek.value = day;
            newPref.dayPeriod.value = period;
            await newPref.save();
            result.push(newPref.id.value);
        }
    }
    return result;
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

async function createRideNew(rideRecord: any, driverId: string, patientId: string, fromId: string, toId: string, context: Context) {
    // try{
    let ride = await context.for(Ride).create();
    ride.importRideNum.value = rideRecord.RideNum;
    ride.driverId.value = driverId;
    ride.patientId.value = patientId;
    ride.from.value = fromId;
    ride.to.value = toId;
    ride.date.value = toDate(rideRecord.Date);
    ride.dayOfWeek.value = DriverPrefs.getDayOfWeek((ride.date.value.getDay() + 1));
    ride.dayPeriod.value = DriverPrefs.getDayPeriod(ride.date.value.getHours() > 12 ? "afternoon" : "morning");
    // console.log(rideRecord.RideNum);
    // console.log(ride);
    await ride.save();
    return ride.id.value;
    // }catch(error){
    //     console.log("error on RideNum: " + rideRecord.RideNum);
    // }
}


// ====================================================================================
// ====================================================================================
// ====================================================================================





export async function importData(db: SqlDatabase, fresh = false) {

    var context = new ServerContext(db);
    // await createDriversFromFiles(volunteersFolder, context);
    // await findRidesDrivers(ridersFolder, context);
    await importAllFromRides(context);


    //await createDriversFromFiles(volunteersFolder, context);

    if (fresh) {
        await importRidesToFiles(ridersFolder);
        await importDriversToFiles(volunteersFolder);
    }

    if (false) {
        var context = new ServerContext(db);

        await createDriversFromFiles(volunteersFolder, context);
        await createRidesFromFiles(ridersFolder, volunteersFolder, context);
    }
}

async function importAllFromRides(context: ServerContext) {
    var rides = fs.readdirSync(ridersFolder);
    console.log("rides.length=" + rides.length);
    for (const id of rides) {
        let fileName = `${ridersFolder}/${id}`;
        var r = JSON.parse(fs.readFileSync(fileName).toString());

        let status: string = r.Status;
        if (status.trim() == 'נמחקה') {
            continue;
        }

        // create driver+prefs
        let driverId = undefined;
        if (r.Drivers && r.Drivers.length > 0) {
            driverId = await createDriverFromFile(context, r.Drivers[0].DisplayName);
            if (driverId && driverId.length > 0) {
            }
        }

        // driverId = await fiilDriverPref(context, r);
        // if(driverId && driverId.length > 0){
        // }

        // create patient
        let patientId = await fiilPatient(context, r);
        if (patientId && patientId.length > 0) {
        }

        let rideId = await fiilRide(context, r, patientId, driverId);
        if (rideId && rideId.length > 0) {
        }
    }
}
var i = 0;
async function createDriverFromFile(context: ServerContext, name: string) {
    // console.log("name=" + name);
    // return;
    var volunteers = fs.readdirSync(volunteersFolder);
    if (volunteers) {
        let fileName = name + ".json";
        if (volunteers.includes(fileName)) {
            let fullPath = `${volunteersFolder}/${fileName}`;
            var person = JSON.parse(fs.readFileSync(fullPath).toString());
            // console.log(++i);

            let driverId = await createDriver(context, person);
            if (driverId && driverId.length > 0) {
                await createDriverPrefs(context, person.PrefTime, driverId, undefined);
            }
            return driverId;
        }
    }
    else {
        console.log(`No volunteers found in '${volunteersFolder}' folder.`);
    }
}

async function findRidesDrivers(ridersFolder: string, context: ServerContext) {
    var rides = fs.readdirSync(ridersFolder);
    for (const id of rides) {
        let fileName = `${ridersFolder}/${id}`;
        var r = JSON.parse(fs.readFileSync(fileName).toString());

        let status: string = r.Status;
        if (status.trim() == 'נמחקה') {
            continue;
        }

        // let locationId = await fiilLocations(context, r);
        // if (locationId && locationId.length > 0) {
        // }

        let driverId = await fiilDriverPref(context, r);//driver&prefs
        if (driverId && driverId.length > 0) {
        }

        let patientId = await fiilPatient(context, r);// patient&locations
        if (patientId && patientId.length > 0) {
        }

        // let rideId = await fiilRide(context, r, patientId, driverId);
        // if (rideId && rideId.length > 0) {
        // }
    }
}

async function fiilPatient(context: Context, r: any) {
    let name = r && r.Pat && r.Pat.EnglishName && r.Pat.EnglishName.length > 0
        ? r.Pat.EnglishName
        : "";
    if (!(name && name.length > 0)) {
        name = r.Pat.CellPhone;
    }
    // name = name.trim().toLowerCase();
    let patient = await context.for(Patient).findOrCreate(
        p => p.name.isEqualTo(name));
    if (!patient.isNew()) {
        console.log(`Duplicate Patient Name: ${name}`);
        return;
    }
    // console.log(patient.name.value);
    patient.mobile.value = r.Pat.CellPhone;
    patient.hebName.value = r.Pat.DisplayName;
    await patient.save();
    return patient.id.value;
}

async function fiilRide(context: Context, r: any, patientId: string, driverId: string) {

    let ride = await context.for(Ride).create();
    ride.patientId.value = patientId;
    ride.driverId.value = driverId;
    // find from-location
    let location = await context.for(Location).findFirst(
        l => l.name.isEqualTo(r.Origin.EnglishName));
    if (location) {
        ride.from.value = location.id.value;
    }
    // find from-location
    location = await context.for(Location).findFirst(
        l => l.name.isEqualTo(r.Destination.EnglishName));
    if (location) {
        ride.to.value = location.id.value;
        let date = toDate(r.Date);
        // console.log(date);
        ride.date.value = date; //DriverPrefs.getDayOfWeek((date.getDay() + 1));
        ride.dayPeriod.value = DriverPrefs.getDayPeriod(date.getHours() > 12 ? "afternoon" : "morning");
    }
    await ride.save();
    return ride.id.value;
}

async function fiilDriverPref(context: Context, r: any) {
    let driverId = "";
    let from = r.Origin.EnglishName;
    let to = r.Destination.EnglishName;
    let driver = "";
    if (r.Drivers && r.Drivers.length > 0) {
        driver = r.Drivers[0].DisplayName;
    }

    if (driver.length > 0) {
        let driverExists = await context.for(Driver).findOrCreate(
            d => d.hebName.isEqualTo(driver));
        if (driverExists.isNew()) {
            // driverExists.name = 
        }
        // let driverExists = await context.for(Driver).findFirst(
        //     d => d.hebName.isEqualTo(driver));
        if (driverExists) {
            driverId = driverExists.id.value;
            let lFrom = await context.for(Location).findOrCreate(
                l => l.name.isEqualTo(from));
            await lFrom.save();
            let lTo = await context.for(Location).findOrCreate(
                l => l.name.isEqualTo(to));
            await lTo.save();

            let prefs = await context.for(DriverPrefs).find({
                where: d => d.driverId.isEqualTo(driverExists.id)
                    .and(d.locationId.isEqualTo(undefined)),
            });
            //create new if not found
            if (prefs == undefined || prefs.length == 0) {
                let newPref = await context.for(DriverPrefs).create();
                newPref.driverId.value = driverExists.id.value;
                prefs.push(newPref);
            }

            for (const p of prefs) {
                await fillPref(volunteersFolder, p, driverExists.hebName.value, context);

                if (!(p.dayOfWeek && p.dayOfWeek.value)) {
                    console.log(p.dayOfWeek.value);
                    fixPrefDays(p, r.Date);
                    console.log(p.dayOfWeek.value);
                    console.log(p.driverId.value);
                }
                p.locationId.value = lFrom.id.value;
                await p.save();
            }
        }
        else {
            console.log(`NO Match for driver ${driver}`);
        }
    }
    return driverId
}

function fixPrefDays(p: DriverPrefs, d: string) {
    if (d && d.length > 0) {
        let date = toDate(d);
        // console.log(date);
        p.dayOfWeek.value = DriverPrefs.getDayOfWeek((date.getDay() + 1));
        p.dayPeriod.value = DriverPrefs.getDayPeriod(date.getHours() > 12 ? "afternoon" : "morning");

        // console.log(p.dayOfWeek.value);
        // console.log(p.dayPeriod.value);
    }
}

async function fillPref(volunteersFolder: string, p: DriverPrefs, driverName: string, context: Context) {

    var volunteers = fs.readdirSync(volunteersFolder);
    if (volunteers) {
        let name = volunteers.find((v) =>
            v.includes(driverName.trim().toLowerCase()));
        if (name) {
            let fileName = `${volunteersFolder}/${name}`;
            var person = JSON.parse(fs.readFileSync(fileName).toString());

            if (person.PrefTime && person.PrefTime[0]) {

                let day = person.PrefTime[0][0];
                let period = person.PrefTime[0][1];

                // var schedule: string[] = person.PrefTime;
                // console.log(person.PrefTime[0][0],person.PrefTime[0][1]);
                if (day) {
                    p.dayOfWeek.value = DriverPrefs.getDayOfWeek(day);
                }
                else {
                    if (person.Date && person.Date.length > 0) {
                        let date = toDate(person.Date);
                        console.log(date);
                        // newPref.dayOfWeek.value = getDayOfWeek(date.getDay().toString());
                        // newPref.dayPeriod.value = getDayPeriod(date.getHours() > 12 ? "afternoon" : "morning");
                    }
                }
                if (person) {
                    p.dayPeriod.value = DriverPrefs.getDayPeriod(period);
                }
            }
            else {

            }
        }
    }
    else {
        console.log(`No volunteers found in '${volunteersFolder}' folder.`);
    }
}

async function createRidesFromFiles(ridersFolder: string, volunteersFolder: string, context: ServerContext) {
    var rides = fs.readdirSync(ridersFolder);
    for (const id of rides) {
        let fileName = `${volunteersFolder}/${id}`;
        var person = JSON.parse(fs.readFileSync(fileName).toString());

        await createLocation(context, person.Destination);
        await createPatient(context, person.Pat);
        await createRide(context, person);
    }
}

async function createDriversFromFiles(volunteersFolder: string, context: ServerContext) {
    var volunteers = fs.readdirSync(volunteersFolder);
    if (volunteers) {
        for (const name of volunteers) {
            let fileName = `${volunteersFolder}/${name}`;
            var person = JSON.parse(fs.readFileSync(fileName).toString());

            let driverId = await createDriver(context, person);
            //await createDriverPrefs(context, person.PrefTime, driverId);
        }
    }
    else {
        console.log(`No volunteers found in '${volunteersFolder}' folder.`);
    }
}

async function createDriver(context: Context, volunteer: any) {
    // console.log(volunteer.DisplayName);
    //     return; 
    if (volunteer.CellPhone && volunteer.CellPhone.length > 0) {
        let name = (volunteer.EnglishFN + " " + volunteer.EnglishLN);
        if ((!(name)) || name.trim().length == 0) {
            // name = volunteer.DisplayName;
            // if ((!(name)) || name.trim().length == 0) {
            //     name = "No Name";
            // }
        }

        if (name) {// Each driver is a user.

            // console.log(name +": " + volunteer.CellPhone);
            // return;
            var user = await context.for(Users)
                .findOrCreate(u => u.name.isEqualTo(volunteer.CellPhone));
            user.name.value = name;// volunteer.DisplayName;
            user.isDriver.value = true;
            user.mobile.value = volunteer.CellPhone;
            user.createDate.value = new Date();
            try { await user.create(volunteer.CellPhone); }
            catch (error) {
                console.log(`${error}(name=${name})`);
            }
        }
        else {
            console.log(`!!!!!!! no name for ${volunteer}`);
            return;
        }
    }
    else {
        console.log(`!!!!!!! no mobile for ${volunteer}`);
        return;
    }

    // return;

    // created by creation of user above.
    let driver = await context.for(Driver).
        findFirst(d => d.userId.isEqualTo(user.id));
    if (driver) {
        // driver.name.value = volunteer.EnglishFN + " " + volunteer.EnglishLN;// volunteer.DisplayName;
        driver.hebName.value = volunteer.DisplayName;
        driver.mobile.value = volunteer.CellPhone;
        driver.email.value = volunteer.Email;
        driver.seats.value = volunteer.AvailableSeats;
        driver.idNumber.value = volunteer.VolunteerIdentity;
        if (volunteer.BirthDate) {
            driver.birthDate.value = new Date(Date.parse(volunteer.BirthDate));
        }
        await driver.save();
        return driver.id.value;
    }
}

async function createDriverPrefs(context: Context, prefs: any, driverId: string, locationId: string) {

    for (const p of prefs) {
        let dPref = await context.for(DriverPrefs).create();
        dPref.driverId.value = driverId;
        dPref.locationId.value = locationId;
        dPref.dayOfWeek.value = DriverPrefs.getDayOfWeek(p[0]);
        dPref.dayPeriod.value = DriverPrefs.getDayPeriod(p[1]);
        await dPref.save();
    }

    // let dPref = await context.for(DriverPrefs).
    //     findOrCreate(prf => prf.locationId.isEqualTo(vPref.DisplayName))
    // dPref.locationId.value = (await context.for(Location)
    //     .findOrCreate(l => l.name.isEqualTo(vPref.location.name))).id.value;
    // dPref.driverId.value = driverId;
    // dPref.dayOfWeek.value = getDayOfWeek(vPref.name);
    // dPref.dayPeriod.value = getDayPeriod(vPref.name);
}

async function createLocation(context: Context, location: any) {
    let loc = await context.for(Location).
        findOrCreate(l => l.name.isEqualTo(location.DisplayName));
    loc.name.value = location.DisplayName;
    loc.type.value = LocationType.border;
    await loc.save();
}

async function createPatient(context: Context, patient: any) {
    let pat = await context.for(Patient).
        findOrCreate(l => l.name.isEqualTo(patient.DisplayName));
    pat.name.value = patient.DisplayName;
    pat.mobile.value = patient.CellPhone;
    await pat.save();
}

async function createRide(context: Context, ride: any) {
    let pat = await context.for(Ride).
        findOrCreate(l => l.id.isEqualTo(ride.DisplayName));
    pat.id.value = ride.DisplayName;
    await pat.save();
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

