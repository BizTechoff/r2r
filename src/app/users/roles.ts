import { Injectable } from '@angular/core';
import { SignedInGuard } from '@remult/angular';



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
        return c => c.isAllowed(Roles.usher) || c.isAllowed(Roles.admin);
    }
}

@Injectable()
export class MatcherGuard extends SignedInGuard {

    isAllowed() {
        return Roles.matcher;
        return c => c.isAllowed(Roles.matcher) || c.isAllowed(Roles.usher) || c.isAllowed(Roles.admin);
    }
}

@Injectable()
export class DriverGuard extends SignedInGuard {

    isAllowed() {
        return Roles.driver;
        return Roles.driver;// c => c.isAllowed(Roles.driver) || c.isAllowed(Roles.usher)  || c.isAllowed(Roles.admin);
    }
}
