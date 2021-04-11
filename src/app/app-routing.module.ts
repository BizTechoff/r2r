import { RemultModule, NotSignedInGuard, SignedInGuard } from '@remult/angular';
import { NgModule, ErrorHandler } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component';


import { UsersComponent } from './users/users.component';
import { AdminGuard, UsherGuard, MatcherGuard, DriverGuard } from './users/roles';
import { ShowDialogOnErrorErrorHandler } from './common/dialog';
import { UsherComponent } from './core/usher/usher.component';
import { PatientComponent } from './core/patient/patient.component';
import { DriverComponent } from './core/driver/driver.component';
import { DemoOneComponent } from './demo/demo-one/demo-one.component';
import { DemoEnumComponent } from './demo/demo-enum/demo-enum.component';
import { DemoIdColumnComponent } from './demo/demo-id-column/demo-id-column.component';


const routes: Routes = [
  { path: 'demo', component: DemoOneComponent },
  { path: 'demoenum', component: DemoEnumComponent },
  { path: 'demo-id-column', component: DemoIdColumnComponent },
  { path: 'Home', component: HomeComponent, canActivate: [NotSignedInGuard] },
  { path: 'Current State', component: UsherComponent, canActivate: [UsherGuard] },
  { path: 'New Patient', component: PatientComponent, canActivate: [MatcherGuard] },
  { path: 'Personal Info', component: DriverComponent, canActivate: [DriverGuard] },
  // { path: 'Preferences', component: DriverComponent, canActivate: [DriverGuard] },
  { path: 'Transportation Requests', component: DriverComponent, canActivate: [DriverGuard] },
  { path: 'User Accounts', component: UsersComponent, canActivate: [AdminGuard] },
  { path: '', redirectTo: '/Home', pathMatch: 'full' },
  { path: '**', redirectTo: '/Home', pathMatch: 'full' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes), RemultModule],
  providers: [AdminGuard, { provide: ErrorHandler, useClass: ShowDialogOnErrorErrorHandler }],
  exports: [RouterModule]
})
export class AppRoutingModule { }

