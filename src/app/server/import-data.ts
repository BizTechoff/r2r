import { Context, ServerContext, SqlDatabase } from '@remult/core';
import * as fs from 'fs';
import * as fetch from 'node-fetch';
import { Driver } from '../core/drivers/driver';
import { DriverPrefs } from '../core/drivers/driverPrefs';
import { DayOfWeek, DayPeriod } from '../core/drivers/driverPrefSchedule';
import { Location, LocationType } from '../core/locations/location';
import { Patient } from '../core/patients/patient';
import { Ride } from '../core/rides/ride';
import { Users } from '../users/users';


export async function importData(db: SqlDatabase, fresh = false) {

    let volunteersFolder = "c:/r2r/volunteers";
    let ridersFolder = "c:/r2r/rides";

    var context = new ServerContext(db);

    await createDriversFromFiles(volunteersFolder, context);

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
            await createDriverPrefs(context, person.PrefTime, driverId);
        }
    }
    else {
        console.log(`No volunteers found in '${volunteersFolder}' folder.`);
    }
}

async function createDriver(context: Context, volunteer: any): Promise<string> {

    if (volunteer.CellPhone) {
        let name = (volunteer.EnglishFN + " " + volunteer.EnglishLN);
        if ((!(name)) || name.trim().length == 0) {
            name = new Date().valueOf().toString();
        }

        if (name) {// Each driver is a user.
            var user = await context.for(Users)
                .findOrCreate(u => u.name.isEqualTo(name));
            user.name.value = name;// volunteer.DisplayName;
            user.isDriver.value = true;
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

    // created by creation of user above.
    let driver = await context.for(Driver).
        findFirst(d => d.userId.isEqualTo(user.id));
    if (driver) {
        // driver.name.value = volunteer.EnglishFN + " " + volunteer.EnglishLN;// volunteer.DisplayName;
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

async function createDriverPrefs(context: Context, prefs: any, driverId: string) {

    for (const p of prefs) {
        let dPref = await context.for(DriverPrefs).create();
        dPref.driverId.value = driverId;
        // dPref.locationId
        dPref.dayOfWeek.value = getDayOfWeek(p[0]);
        dPref.dayPeriod.value = getDayPeriod(p[1]);
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

function getDayOfWeek(desc: string) {
    switch (desc) {
        case "ראשון":
            return DayOfWeek.sunday;
        case "שני":
            return DayOfWeek.monday;
        case "שלישי":
            return DayOfWeek.tuesday;
        case "רביעי":
            return DayOfWeek.wednesday;
        case "חמישי":
            return DayOfWeek.thursday;
        case "שישי":
            return DayOfWeek.friday;
        case "שבת":
            return DayOfWeek.saturday;

        default:
            break;
    }
}

function getDayPeriod(desc: string) {
    switch (desc) {
        case "אחהצ":
        case "אחה\"צ":
        case "אחר הצהריים":
            return DayPeriod.afternoon;
        case "בוקר":
            return DayPeriod.morning;

        default:
            break;
    }
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
