import { RemultModule, NotSignedInGuard, SignedInGuard } from '@remult/angular';
import { NgModule, ErrorHandler } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';


import { UsersComponent } from './users/users.component';
import { AdminGuard, UsherGuard, MatcherGuard, DriverGuard } from './users/roles';
import { ShowDialogOnErrorErrorHandler } from './common/dialog';
import { UsherComponent } from './core/usher/usher.component';
import { DemoOneComponent } from './demo/demo-one/demo-one.component';
import { DemoEnumComponent } from './demo/demo-enum/demo-enum.component';
import { DemoIdColumnComponent } from './demo/demo-id-column/demo-id-column.component';
import { LocationsComponent } from './core/locations/locations.component';
import { DriversComponent } from './core/drivers/drivers.component';
import { PatientsComponent } from './core/patients/patients.component';
import { RidesComponent } from './core/rides/rides.component';


const routes: Routes = [

  { path: 'Rides', component: RidesComponent },
  { path: 'Drivers', component: DriversComponent },//, canActivate: [NotSignedInGuard] },
  { path: 'Patients', component: PatientsComponent },
  { path: 'Locations', component: LocationsComponent },//, canActivate: [NotSignedInGuard] },
  { path: '--------------', component: DemoOneComponent },
  { path: 'demo', component: DemoOneComponent },
  { path: 'demoenum', component: DemoEnumComponent },
  { path: 'demo-id-column', component: DemoIdColumnComponent },
  { path: 'Home', component: HomeComponent },//, canActivate: [NotSignedInGuard] },

  { path: 'Current State', component: UsherComponent },//, canActivate: [UsherGuard] },
  { path: 'Personal Info', component: DriversComponent },//, canActivate: [DriverGuard] },
  // { path: 'Preferences', component: DriverComponent, canActivate: [DriverGuard] },
  { path: 'Transportation Requests', component: DriversComponent },//, canActivate: [DriverGuard] },
  { path: 'User Accounts', component: UsersComponent },//, canActivate: [AdminGuard] },
  { path: '', redirectTo: '/Home', pathMatch: 'full' },
  { path: '**', redirectTo: '/Home', pathMatch: 'full' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes), RemultModule],
  providers: [AdminGuard, { provide: ErrorHandler, useClass: ShowDialogOnErrorErrorHandler }],
  exports: [RouterModule]
})
export class AppRoutingModule { }

