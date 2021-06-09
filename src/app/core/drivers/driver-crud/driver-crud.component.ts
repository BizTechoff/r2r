import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Context, DataAreaSettings, DateColumn, DateTimeColumn, NumberColumn } from '@remult/core';
import { DialogService } from '../../../common/dialog';
import { InputAreaComponent } from '../../../common/input-area/input-area.component';
import { TODAY } from '../../../shared/types';
import { addDays } from '../../../shared/utils';
import { Driver } from '../driver';

@Component({
  selector: 'app-driver-crud',
  templateUrl: './driver-crud.component.html',
  styleUrls: ['./driver-crud.component.scss']
})
export class DriverCrudComponent implements OnInit {

  args: { did?: string } = { did: '' };
  okPressed = false;
  dataArea: DataAreaSettings;
  d: Driver;
  age = new NumberColumn();

  constructor(private context: Context, private dialog: DialogService, private dialogRef: MatDialogRef<any>) { }

  async ngOnInit() {
    if (this.args.did && this.args.did.length > 0) {
      this.d = await this.context.for(Driver).findId(this.args.did);
    }
    if (!(this.d)) {
      console.log(` (DriverCrudComponent(this.args.did=${this.args.did})`);
      throw `Allow only modifing driver, Creating Driver is Only from users)`;
    }

    this.dataArea = new DataAreaSettings({
      columnSettings: () => [
        [this.d.name, this.d.idNumber],
        [{ column: this.d.mobile }, this.d.seats],
        [this.d.birthDate, {
          column: this.age, readOnly: true, visible: () => {// each redraw calc age
            if (this.d.hasBirthDate()) {
              this.age.value = addDays(TODAY).getFullYear() - this.d.birthDate.value.getFullYear();
            }
            return true;
          }
        }],
        this.d.email,
        [this.d.city, this.d.address],
        { column: this.d.freezeTillDate, readOnly: true, visible: () => { return this.d.hasFreezeDate(); } },
      ],
    });
  }

  async save(thenClose = true) {
    if (await this.validate()) {
      if (this.d && this.d.wasChanged()) {// || isNew()
        await this.d.save();
      }
      if (thenClose) {
        this.select();
      }
    }
  }

  async validate(): Promise<boolean> {
    if (!this.d.name.value) {
      this.d.name.validationError = `Required`;
      await this.dialog.error(`${this.d.name.defs.caption}: ${this.d.name.validationError}`);
      return false;
    }
    this.d.name.value = this.d.name.value.trim();
    if (this.d.name.value.length < 2) {
      this.d.name.validationError = `at least 2 letters`;
      await this.dialog.error(`${this.d.name.defs.caption}: ${this.d.name.validationError}`);
      return false;
    }

    if (!this.d.mobile.value) {
      this.d.mobile.validationError = `Required`;
      await this.dialog.error(`${this.d.mobile.defs.caption}: ${this.d.mobile.validationError}`);
      return false;
    }
    let mobile = this.d.mobile.value.trim();;
    mobile = mobile.replace('-', '').replace('-', '').replace('-', '').replace('-', '');
    if (mobile.length != 10) {
      this.d.mobile.validationError = `should be 10 digits`;
      await this.dialog.error(`${this.d.mobile.defs.caption}: ${this.d.mobile.validationError} : ${mobile}`);
      return false;
    }
    if (mobile.slice(0, 2) != '05') {
      this.d.mobile.validationError = `must start with '05'`;
      await this.dialog.error(`${this.d.mobile.defs.caption}: ${this.d.mobile.validationError}`);
      return false;
    }
    for (const c of mobile) {
      if (!['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(c)) {
        this.d.mobile.validationError = `should be ONLY digits`;
        await this.dialog.error(`${this.d.mobile.defs.caption}: ${this.d.mobile.validationError}`);
        return false;
      }
    }
    if (!(this.d.mobile.value === mobile)) {
      this.d.mobile.value = mobile;
    }

    if (!this.d.birthDate || !this.d.birthDate.value) {
      this.d.birthDate.validationError = 'Required';
      await this.dialog.error(`${this.d.birthDate.defs.caption}: ${this.d.birthDate.validationError}`);
      return false;
    }
    if (!(this.d.birthDate.value.getFullYear() > 1900 && this.d.birthDate.value.getFullYear() <= addDays(TODAY).getFullYear())) {
      this.d.birthDate.validationError = 'Not Valid';
      await this.dialog.error(`${this.d.birthDate.defs.caption}: ${this.d.birthDate.validationError}`);
      return false;
    }
    if (!this.d.seats.value || this.d.seats.value <= 0) {
      this.d.seats.validationError = 'at least 1 seat';
      await this.dialog.error(this.d.seats.defs.caption + ' ' + this.d.seats.validationError);
      return false;
    }

    return true;
  }

  async freeze(): Promise<boolean> {
    let result = false;
    if (!await this.validate()) {
      return result;
    }
    if (this.d.wasChanged()) {// || isNew()
      let yes = await this.dialog.yesNoQuestion(`Driver didn't saved. Save and continue?`);
      if (yes) {
        await this.d.save();//false);
      }
      else {
        return result;
      }
    }
    let today = addDays(TODAY);
    let endOfMonth = addDays(-1, new Date(today.getFullYear(), today.getMonth() + 1, 1));//(1 in next-month)-1

    let freezeDate = new DateColumn({ defaultValue: endOfMonth });
    await this.context.openDialog(InputAreaComponent, ia => ia.args = {
      title: `Freeze Driver: ${this.d.name.value}`,
      columnSettings: () => [
        {
          column: freezeDate,
          caption: 'Till Date',
        },
      ],
      validate: async () => {
        let ok = freezeDate && freezeDate.value && (freezeDate.value > addDays(TODAY));
        if (!(ok)) {
          freezeDate.validationError = 'Date must be greater then today';
          throw freezeDate.validationError;
        }
      },
      ok: async () => {
        if (freezeDate.value) {
          this.d.freezeTillDate.value = freezeDate.value;
          await this.d.save();
          result = true;
        }
      },
    });
    return result;
  }

  async unfreeze(): Promise<boolean> {
    let result = false;
    if (!await this.validate()) {
      return result;
    }
    let yes = false;
    if (this.d.wasChanged()) {// || isNew()
      yes = await this.dialog.yesNoQuestion(`Driver didn't saved. Save and continue?`);
      if (yes) {
        await this.d.save();
      }
      else {
        return result;
      }
    }

    if (!(yes)) {
      yes = await this.dialog.yesNoQuestion(`Unfreeze driver ${this.d.name.value}`);
    }
    if (yes) {
      this.d.freezeTillDate.value = DateTimeColumn.stringToDate('1.1.1900');
      await this.d.save();
      result = true;
    }
    return result;
  }

  close() {
    this.dialogRef.close();
  }
  select() {
    this.dialogRef.close();
    this.okPressed = true;
  }

}
