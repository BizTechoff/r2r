import { ErrorHandler, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RemultModule } from '@remult/angular';
import { ShowDialogOnErrorErrorHandler } from './common/dialog';
import { DriverDetailsComponent } from './core/drivers/driver-details/driver-details.component';
import { DriverPreferencesComponent } from './core/drivers/driver-preferences/driver-preferences.component';
import { DriverReleventRidesComponent } from './core/drivers/driver-relevent-rides/driver-relevent-rides.component';
import { DriverRidesComponent } from './core/drivers/driver-rides/driver-rides.component';
import { DriverSettingsComponent } from './core/drivers/driver-settings/driver-settings.component';
import { DriverUsefulInformationComponent } from './core/drivers/driver-useful-information/driver-useful-information.component';
import { DriversComponent } from './core/drivers/drivers.component';
import { LocationsComponent } from './core/locations/locations.component';
import { PatientsComponent } from './core/patients/patients.component';
import { RidesComponent } from './core/rides/rides.component';
// import { UsherComponent } from './core/usher/usher.component';
import { HomeComponent } from './home/home.component';
import { AdminGuard } from './users/roles';
import { UsersComponent } from './users/users.component';


const routes: Routes = [
  { path: '---- DRIVER ------', component: HomeComponent },
  { path: 'Rides', component: DriverRidesComponent },
  { path: 'Settings', component: DriverSettingsComponent },//, canActivate: [AdminGuard] },
  { path: 'Useful Information', component: DriverUsefulInformationComponent },
  // { path: 'Find Me a Ride', component: DriverRidesComponent },
  // { path: 'My Rides', component: DriverReleventRidesComponent },
  { path: '---- MACHER ------', component: HomeComponent },
  // { path: 'Personal Info', component: UsersComponent },
  { path: 'Patients', component: PatientsComponent },
  { path: '---- USHER ------', component: HomeComponent },
  { path: 'Rides2', component: RidesComponent },
  { path: 'Drivers', component: DriversComponent },//, canActivate: [NotSignedInGuard] },
  { path: 'Patients', component: PatientsComponent },
  // { path: '__________', component: HomeComponent },
  { path: 'Locations', component: LocationsComponent },//, canActivate: [NotSignedInGuard] },
  { path: '---- ADMIN ------', component: HomeComponent },
  { path: 'Reports', component: LocationsComponent },//, canActivate: [NotSignedInGuard] },
  { path: 'User Accounts', component: UsersComponent },//, canActivate: [AdminGuard] },
  
  // { path: 'demo', component: DemoOneComponent },
  // { path: 'demoenum', component: DemoEnumComponent },
  // { path: 'demo-id-column', component: DemoIdColumnComponent },
  // { path: 'Home', component: HomeComponent },//, canActivate: [NotSignedInGuard] },

  // { path: 'Current State', component: UsherComponent },//, canActivate: [UsherGuard] },
  // { path: 'Personal Info', component: DriversComponent },//, canActivate: [DriverGuard] },
  // { path: 'Preferences', component: DriverComponent, canActivate: [DriverGuard] },
  // { path: 'Transportation Requests', component: DriversComponent },//, canActivate: [DriverGuard] },
  { path: '', redirectTo: '/---- DRIVER ------', pathMatch: 'full' },
  { path: '**', redirectTo: '/---- DRIVER ------', pathMatch: 'full' }

]; 

@NgModule({
  imports: [RouterModule.forRoot(routes), RemultModule],
  providers: [AdminGuard, { provide: ErrorHandler, useClass: ShowDialogOnErrorErrorHandler }],
  exports: [RouterModule]
})
export class AppRoutingModule { }
