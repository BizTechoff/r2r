import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RemultModule } from '@remult/angular';
import { UsersComponent } from './users/users.component';
import { HomeComponent } from './home/home.component';
import { YesNoQuestionComponent } from './common/yes-no-question/yes-no-question.component';
import { InputAreaComponent } from './common/input-area/input-area.component';
import { DialogService } from './common/dialog';
import { AdminGuard, DriverGuard, MatcherGuard, UsherGuard } from './users/roles';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { UsherComponent } from './core/usher/usher.component';
import { DemoOneComponent } from './demo/demo-one/demo-one.component';
import { DemoEnumComponent } from './demo/demo-enum/demo-enum.component';
import { DemoIdColumnComponent } from './demo/demo-id-column/demo-id-column.component';
import { SelectDriverComponent } from './demo/select-driver/select-driver.component';
import { LocationsComponent } from './core/locations/locations.component';
import { DriversComponent } from './core/drivers/drivers.component';
import { PatientsComponent } from './core/patients/patients.component';
import { RidesComponent } from './core/rides/rides.component';
import { GridDialogComponent } from './common/grid-dialog/grid-dialog.component';
import { DynamicServerSideSearchDialogComponent } from './common/dynamic-server-side-search-dialog/dynamic-server-side-search-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    UsersComponent,
    HomeComponent,
    YesNoQuestionComponent,
    InputAreaComponent,
    UsherComponent,
    DemoOneComponent,
    DemoEnumComponent,
    DemoIdColumnComponent,
    SelectDriverComponent,
    LocationsComponent,
    DriversComponent,
    PatientsComponent,
    RidesComponent,
    GridDialogComponent,
    DynamicServerSideSearchDialogComponent
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
    RemultModule,
    BrowserAnimationsModule
  ],
  providers: [DialogService, AdminGuard, UsherGuard, MatcherGuard, DriverGuard],
  bootstrap: [AppComponent],
  entryComponents: [YesNoQuestionComponent, InputAreaComponent, SelectDriverComponent,
    GridDialogComponent, DynamicServerSideSearchDialogComponent]
})
export class AppModule { }
