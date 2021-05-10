import { ErrorHandler, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotSignedInGuard, RemultModule } from '@remult/angular';
import { ShowDialogOnErrorErrorHandler } from './common/dialog';
import { ApplicationSettingsComponent } from './core/application-settings/application-settings.component';
import { DriverHistoryComponent } from './core/drivers/driver-history/driver-history.component';
import { DriverRegisterComponent } from './core/drivers/driver-register/driver-register.component';
import { DriverRidesComponent } from './core/drivers/driver-rides/driver-rides.component';
import { DriverSettingsComponent } from './core/drivers/driver-settings/driver-settings.component';
import { DriverUsefulInformationComponent } from './core/drivers/driver-useful-information/driver-useful-information.component';
import { DriversComponent } from './core/drivers/drivers.component';
import { LocationsComponent } from './core/locations/locations.component';
import { PatientsComponent } from './core/patients/patients.component';
import { RidesComponent } from './core/rides/rides.component';
import { UsherComponent } from './core/usher/usher.component';
import { HomeComponent } from './home/home.component';
import { AdminGuard, DriverGuard, MatcherGuard, UsherGuard } from './users/roles';
import { UsersComponent } from './users/users.component';


const routes: Routes = [

  // Driver
  { path: 'Rides4Driver', component: DriverRidesComponent, canActivate: [DriverGuard], data: { name: "My Rides" } },
  { path: 'Settings', component: DriverSettingsComponent, canActivate: [DriverGuard], data: { name: "Settings" } },
  { path: 'My History Rides', component: DriverHistoryComponent, canActivate: [DriverGuard], data: { name: "History" } },
  { path: 'Register New Rides', component: DriverRegisterComponent, canActivate: [DriverGuard], data: { name: "Register" } },
  { path: 'UsefulInformation', component: DriverUsefulInformationComponent, canActivate: [DriverGuard], data: { name: "Useful Information" } },

  // Usher
  { path: 'Rides4Usher', component: UsherComponent, canActivate: [UsherGuard], data: { name: "Rides" } },
  // { path: 'Rides', component: RidesComponent, canActivate: [UsherGuard] },
  { path: 'Drivers', component: DriversComponent, canActivate: [UsherGuard] },

  // Matcher
  { path: 'PatientsMatcher', component: PatientsComponent, canActivate: [MatcherGuard], data: { name: "Patients" } },

  { path: 'Locations', component: LocationsComponent, canActivate: [UsherGuard] },

  // Admin
  { path: 'Reports', component: LocationsComponent, canActivate: [AdminGuard] },
  { path: 'User Accounts', component: UsersComponent, canActivate: [AdminGuard] },
  { path: 'AppSettings', component: ApplicationSettingsComponent, canActivate: [AdminGuard], data: { name: "App Settings" } },

  { path: 'Home', component: HomeComponent, canActivate: [NotSignedInGuard], data: { name: "Welcome" } },

  { path: '', redirectTo: '/Home', pathMatch: 'full' },
  { path: '**', redirectTo: '/Home', pathMatch: 'full' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes), RemultModule],
  providers: [AdminGuard, { provide: ErrorHandler, useClass: ShowDialogOnErrorErrorHandler }],
  exports: [RouterModule]
})
export class AppRoutingModule { }
