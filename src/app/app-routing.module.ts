import { ErrorHandler, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotSignedInGuard, RemultModule } from '@remult/angular';
import { ShowDialogOnErrorErrorHandler } from './common/dialog';
import { DriverHistoryComponent } from './core/drivers/driver-history/driver-history.component';
import { DriverRegisterComponent } from './core/drivers/driver-register/driver-register.component';
import { DriverRidesComponent } from './core/drivers/driver-rides/driver-rides.component';
import { DriverSettingsComponent } from './core/drivers/driver-settings/driver-settings.component';
import { DriverUsefulInformationComponent } from './core/drivers/driver-useful-information/driver-useful-information.component';
import { DriversListComponent } from './core/drivers/drivers-list/drivers-list.component';
import { LocationsListComponent } from './core/locations/locations-list/locations-list.component';
import { PatientRidesComponent } from './core/patients/patient-rides/patient-rides.component';
import { PatientsListComponent } from './core/patients/patients-list/patients-list.component';
import { RegisterRidesComponent } from './core/rides/register-rides/register-rides.component';
import { UsherComponent } from './core/usher/usher.component';
// import { DemoComponent } from './demo/demo.component';
import { HomeComponent } from './home/home.component';
import { GeneralReportComponent } from './reports/general-report/general-report.component';
import { AdminGuard, DriverGuard, MatcherGuard, OnlyDriverGuard, UsherGuard } from './users/roles';
import { UsersComponent } from './users/users.component';


const routes: Routes = [
  //  {path:'demo',component: DemoComponent},
  // Driver
  { path: 'd/rides', component: DriverRidesComponent, canActivate: [OnlyDriverGuard], data: { name: "My Rides" } },
  { path: 'd/register', component: DriverRegisterComponent, canActivate: [OnlyDriverGuard], data: { name: "Register To Ride" } },
  { path: 'd/info', component: DriverUsefulInformationComponent, canActivate: [OnlyDriverGuard], data: { name: "Useful Information" } },
  { path: 'd/history', component: DriverHistoryComponent, canActivate: [OnlyDriverGuard], data: { name: "History" } },
  { path: 'd/defs', component: DriverSettingsComponent, canActivate: [OnlyDriverGuard], data: { name: "Settings" } },

  // Matcher
  { path: 'm/patients', component: PatientsListComponent, canActivate: [MatcherGuard], data: { name: "Patients" } },
  { path: 'm/rides', component: PatientRidesComponent, canActivate: [MatcherGuard], data: { name: "Rides" } },

  // Usher
  { path: 'Rides4Usher', component: UsherComponent, canActivate: [UsherGuard], data: { name: "Rides" } },
  // { path: 'Rides', component: RidesComponent, canActivate: [UsherGuard] },
  { path: 'Drivers', component: DriversListComponent, canActivate: [UsherGuard] },
  { path: 'PatientsUsher', component: PatientsListComponent, canActivate: [UsherGuard], data: { name: "Patients" } },

  { path: 'Locations', component: LocationsListComponent, canActivate: [UsherGuard] },

  { path: 'Register Rides', component: RegisterRidesComponent, canActivate: [AdminGuard], data: { name: "Register Rides" } },
  // Admin
  { path: 'Reports', component: GeneralReportComponent, canActivate: [AdminGuard] },
  // { path: 'AppSettings', component: ApplicationSettingsComponent, canActivate: [AdminGuard], data: { name: "App Settings" } },
  { path: 'User Accounts', component: UsersComponent, canActivate: [AdminGuard] },

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
