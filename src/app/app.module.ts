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
import { DriverDetailsComponent } from './core/drivers/driver-details/driver-details.component';
import { DriverPreferencesComponent } from './core/drivers/driver-preferences/driver-preferences.component';
import { DriverRidesComponent } from './core/drivers/driver-rides/driver-rides.component';
import { DriverUsefulInformationComponent } from './core/drivers/driver-useful-information/driver-useful-information.component';
import { DriversComponent } from './core/drivers/drivers.component';
import { LocationsComponent } from './core/locations/locations.component';
import { PatientsComponent } from './core/patients/patients.component';
import { RidesComponent } from './core/rides/rides.component';
import { UsherComponent } from './core/usher/usher.component';
import { HomeComponent } from './home/home.component';
import { AdminGuard, DriverGuard, MatcherGuard, UsherGuard } from './users/roles';
import { UsersComponent } from './users/users.component';
import { ReportWeeklyRidesComponent } from './reports/report-weekly-rides/report-weekly-rides.component';
import { ReportWeeklyDriversComponent } from './reports/report-weekly-drivers/report-weekly-drivers.component';
import { DriverReleventRidesComponent } from './core/drivers/driver-relevent-rides/driver-relevent-rides.component';
import { ApplicationSettingsComponent } from './core/application-settings/application-settings.component';
import { DriverSettingsComponent } from './core/drivers/driver-settings/driver-settings.component';


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
    DriverDetailsComponent,
    DriverPreferencesComponent,
    DriverRidesComponent,
    DriverUsefulInformationComponent,
    ReportWeeklyRidesComponent,
    ReportWeeklyDriversComponent,
    DriverReleventRidesComponent,
    ApplicationSettingsComponent,
    DriverSettingsComponent,
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
  providers: [DialogService, AdminGuard, UsherGuard, MatcherGuard, DriverGuard],
  bootstrap: [AppComponent],
  entryComponents: [YesNoQuestionComponent, InputAreaComponent,
    GridDialogComponent, DynamicServerSideSearchDialogComponent]
})
export class AppModule { }
