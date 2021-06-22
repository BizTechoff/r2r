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
import { DriverHistoryComponent } from './core/drivers/driver-history/driver-history.component';
import { DriverRegisterComponent } from './core/drivers/driver-register/driver-register.component';
import { DriverRidesComponent } from './core/drivers/driver-rides/driver-rides.component';
import { DriverSettingsComponent } from './core/drivers/driver-settings/driver-settings.component';
import { DriverUsefulInformationComponent } from './core/drivers/driver-useful-information/driver-useful-information.component';
import { LocationAreaComponent } from './core/locations/location-area/location-area.component';
import { PatientContactsComponent } from './core/patients/patient-contacts/patient-contacts.component';
import { PatientCrudComponent } from './core/patients/patient-crud/patient-crud.component';
import { RegisterRidesComponent } from './core/rides/register-rides/register-rides.component';
import { RideCrudComponent } from './core/rides/ride-crud/ride-crud.component';
import { SendSmsComponent } from './core/services/send-sms/send-sms.component';
import { SetDriverComponent } from './core/usher/set-driver/set-driver.component';
import { SuggestDriverComponent } from './core/usher/suggest-driver/suggest-driver.component';
import { UsherComponent } from './core/usher/usher.component';
import { HomeComponent } from './home/home.component';
import { GeneralReportComponent } from './reports/general-report/general-report.component';
import { ServerEventsService } from './server/server-events-service';
import { AdminGuard, DriverGuard, MatcherGuard, OnlyDriverGuard, UsherGuard } from './users/roles';
import { UsersComponent } from './users/users.component';
import { LocationsListComponent } from './core/locations/locations-list/locations-list.component';
import { DriversListComponent } from './core/drivers/drivers-list/drivers-list.component';
import { PatientsListComponent } from './core/patients/patients-list/patients-list.component';
import { PatientRidesComponent } from './core/patients/patient-rides/patient-rides.component';
import { DriverCrudComponent } from './core/drivers/driver-crud/driver-crud.component';
import { DriverRideProblemComponent } from './core/drivers/driver-ride-problem/driver-ride-problem.component';

 
@NgModule({
  declarations: [
    AppComponent,
    UsersComponent,
    HomeComponent,
    YesNoQuestionComponent,
    InputAreaComponent,
    UsherComponent,
    GridDialogComponent,
    DynamicServerSideSearchDialogComponent,
    DriverRidesComponent,
    DriverUsefulInformationComponent,
    DriverSettingsComponent,
    SetDriverComponent,
    DriverRegisterComponent,
    DriverHistoryComponent,
    PatientContactsComponent,
    RegisterRidesComponent,
    LocationAreaComponent,
    PatientCrudComponent,
    SuggestDriverComponent,
    GeneralReportComponent,
    SendSmsComponent,
    RideCrudComponent,
    LocationsListComponent,
    DriversListComponent,
    PatientsListComponent,
    PatientRidesComponent,
    DriverCrudComponent,
    DriverRideProblemComponent
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
  providers: [DialogService, AdminGuard, UsherGuard, MatcherGuard, DriverGuard, OnlyDriverGuard, ServerEventsService
  
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
  // DIALOGS - POPUPS
  entryComponents: [YesNoQuestionComponent, InputAreaComponent, GridDialogComponent, 
    DynamicServerSideSearchDialogComponent, DriverRideProblemComponent,
    SetDriverComponent, SendSmsComponent, RideCrudComponent, DriverCrudComponent,
    PatientContactsComponent, LocationAreaComponent, PatientCrudComponent, SuggestDriverComponent]
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

