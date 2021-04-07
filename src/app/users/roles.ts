import { SignedInGuard } from '@remult/angular';
import { Injectable } from '@angular/core';



export const Roles = { 
    admin: 'admin',
    usher: 'usher',//סדרן
    matcher: 'matcher',//מתאמת
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
        return Roles.usher;
    }
}

@Injectable()
export class MatcherGuard extends SignedInGuard {

    isAllowed() {
        return Roles.matcher;
    }
}

@Injectable()
export class DriverGuard extends SignedInGuard {

    isAllowed() {
        return Roles.driver;
    }
}
