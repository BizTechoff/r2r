import { ErrorHandler, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RemultModule } from '@remult/angular';
import { ShowDialogOnErrorErrorHandler } from './common/dialog';
import { DriversComponent } from './core/drivers/drivers.component';
import { LocationsComponent } from './core/locations/locations.component';
import { PatientsComponent } from './core/patients/patients.component';
import { RidesComponent } from './core/rides/rides.component';
// import { UsherComponent } from './core/usher/usher.component';
import { HomeComponent } from './home/home.component';
import { AdminGuard } from './users/roles';
import { UsersComponent } from './users/users.component';


const routes: Routes = [

  { path: 'Rides', component: RidesComponent },
  { path: 'Drivers', component: DriversComponent },//, canActivate: [NotSignedInGuard] },
  { path: 'Patients', component: PatientsComponent },
  { path: '--------------', component: HomeComponent },
  { path: 'Locations', component: LocationsComponent },//, canActivate: [NotSignedInGuard] },
  // { path: 'demo', component: DemoOneComponent },
  // { path: 'demoenum', component: DemoEnumComponent },
  // { path: 'demo-id-column', component: DemoIdColumnComponent },
  // { path: 'Home', component: HomeComponent },//, canActivate: [NotSignedInGuard] },

  // { path: 'Current State', component: UsherComponent },//, canActivate: [UsherGuard] },
  // { path: 'Personal Info', component: DriversComponent },//, canActivate: [DriverGuard] },
  // { path: 'Preferences', component: DriverComponent, canActivate: [DriverGuard] },
  // { path: 'Transportation Requests', component: DriversComponent },//, canActivate: [DriverGuard] },
  { path: 'User Accounts', component: UsersComponent },//, canActivate: [AdminGuard] },
  { path: '', redirectTo: '/--------------', pathMatch: 'full' },
  { path: '**', redirectTo: '/--------------', pathMatch: 'full' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes), RemultModule],
  providers: [AdminGuard, { provide: ErrorHandler, useClass: ShowDialogOnErrorErrorHandler }],
  exports: [RouterModule]
})
export class AppRoutingModule { }
