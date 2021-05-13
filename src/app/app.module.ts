import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RemultModule } from '@remult/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DialogService } from './common/dialog';
import { DynamicServerSideSearchDialogComponent } from './common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component';
import { GridDialogComponent } from './common/grid-dialog/grid-dialog.component';
import { InputAreaComponent } from './common/input-area/input-area.component';
import { YesNoQuestionComponent } from './common/yes-no-question/yes-no-question.component';
import { ApplicationSettingsComponent } from './core/application-settings/application-settings.component';
import { DriverRidesComponent } from './core/drivers/driver-rides/driver-rides.component';
import { DriverSettingsComponent } from './core/drivers/driver-settings/driver-settings.component';
import { DriverUsefulInformationComponent } from './core/drivers/driver-useful-information/driver-useful-information.component';
import { DriversComponent } from './core/drivers/drivers.component';
import { LocationsComponent } from './core/locations/locations.component';
import { PatientsComponent } from './core/patients/patients.component';
import { RidesComponent } from './core/rides/rides.component';
import { SetDriverComponent } from './core/usher/set-driver/set-driver.component';
import { UsherComponent } from './core/usher/usher.component';
import { HomeComponent } from './home/home.component';
import { ReportWeeklyDriversComponent } from './reports/report-weekly-drivers/report-weekly-drivers.component';
import { ReportWeeklyRidesComponent } from './reports/report-weekly-rides/report-weekly-rides.component';
import { ServerEventsService } from './server/server-events-service';
import { Utils } from './shared/utils';
import { AdminGuard, DriverGuard, MatcherGuard, UsherGuard } from './users/roles';
import { UsersComponent } from './users/users.component';
import { ApproveDriverComponent } from './core/usher/approve-driver/approve-driver.component';
import { ShowRidesComponent } from './core/usher/show-rides/show-rides.component';
import { DriverRegisterComponent } from './core/drivers/driver-register/driver-register.component';
import { DriverHistoryComponent } from './core/drivers/driver-history/driver-history.component';
import { PatientContactsComponent } from './core/patients/patient-contacts/patient-contacts.component';
import { RegisterRidesComponent } from './core/rides/register-rides/register-rides.component';
import { LocationAreaComponent } from './core/locations/location-area/location-area.component';
import { PatientCrudComponent } from './core/patients/patient-crud/patient-crud.component';
import { ReturnRidesComponent } from './core/rides/return-rides/return-rides.component';
import { SuggestDriverComponent } from './core/usher/suggest-driver/suggest-driver.component';
import { ApprovePatientRideComponent } from './core/patients/approve-patient-ride/approve-patient-ride.component';


@NgModule({
  declarations: [
    AppComponent,
    UsersComponent,
    HomeComponent,
    YesNoQuestionComponent,
    InputAreaComponent,
    UsherComponent,
    LocationsComponent,
    DriversComponent,
    PatientsComponent,
    RidesComponent,
    GridDialogComponent,
    DynamicServerSideSearchDialogComponent,
    DriverRidesComponent,
    DriverUsefulInformationComponent,
    ReportWeeklyRidesComponent,
    ReportWeeklyDriversComponent,
    ApplicationSettingsComponent,
    DriverSettingsComponent,
    SetDriverComponent,
    ApproveDriverComponent,
    ShowRidesComponent,
    DriverRegisterComponent,
    DriverHistoryComponent,
    PatientContactsComponent,
    RegisterRidesComponent,
    LocationAreaComponent,
    PatientCrudComponent,
    ReturnRidesComponent,
    SuggestDriverComponent,
    ApprovePatientRideComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatExpansionModule,
    RemultModule,
    BrowserAnimationsModule
  ],
  providers: [DialogService, AdminGuard, UsherGuard, MatcherGuard, DriverGuard, ServerEventsService, Utils,

    // {
    //   provide: ApplicationSettings, useFactory: (service: SettingsService) => {
    //     return service.instance;
    //   },
    //   deps: [SettingsService]
    // },
    // {
    //   provide: APP_INITIALIZER,
    //   deps: [JwtSessionManager, SettingsService,Context],
    //   useFactory: initApp,
    //   multi: true,

    // },
    // SettingsService,
  ],
  bootstrap: [AppComponent],
  entryComponents: [YesNoQuestionComponent, InputAreaComponent,    GridDialogComponent, DynamicServerSideSearchDialogComponent, 
    SetDriverComponent, ApproveDriverComponent, ShowRidesComponent, PatientContactsComponent, LocationAreaComponent, PatientCrudComponent, SuggestDriverComponent]
})
export class AppModule { }

// export function initApp(session: JwtSessionManager, settings: SettingsService,context:Context) {
//   return async () => {

//     try {
//       // session.loadSessionFromCookie(Sites.getOrganizationFromContext(context));

//       await settings.init();
//     }
//   }
// }

