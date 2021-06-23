import { Injectable } from '@angular/core';
import { SignedInGuard } from '@remult/angular';
import { Context } from '@remult/core';



export const Roles = {
    admin: 'admin',//מנהל
    usher: 'usher',//מתאמת ישראלית, סדרן
    matcher: 'matcher',//מתאמת פלשתינית
    driver: 'driver',//מתנדב
}


@Injectable()
export class AdminGuard extends SignedInGuard {

    isAllowed() {
        return Roles.admin;
    }
}

@Injectable()
export class UsherGuard extends SignedInGuard {

    isAllowed() {
        return [Roles.usher, Roles.admin];
        // return (c: Context) => (c.isAllowed([Roles.usher, Roles.admin]));
    }
}

@Injectable()
export class MatcherGuard extends SignedInGuard {

    isAllowed() {
        return (c: Context) => (c.isAllowed(Roles.matcher) && (!(c.isAllowed([Roles.admin, Roles.usher, Roles.driver]))));
    }
    // isAllowed() {
    //     return Roles.matcher;
    // }
}

@Injectable()
export class DriverGuard extends SignedInGuard {

    isAllowed() {
        return Roles.driver;
    }
}

@Injectable()
export class OnlyDriverGuard extends SignedInGuard {
    isAllowed() {
        return (c: Context) => c.isAllowed(Roles.driver) && (!(c.isAllowed([Roles.admin, Roles.usher, Roles.matcher])));
    }
}

@Injectable()
export class DriverPlusGuard extends SignedInGuard {
    isAllowed() {
        return (c: Context) => c.isAllowed(Roles.driver) && c.isAllowed([Roles.admin, Roles.usher, Roles.matcher]);
    }
}
