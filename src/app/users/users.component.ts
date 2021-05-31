import { Component, OnInit } from '@angular/core';
import { PasswordColumn, Users } from './users';
import { Context, ServerFunction } from '@remult/core';

import { DialogService } from '../common/dialog';
import { Roles } from './roles';
import { InputAreaComponent } from '../common/input-area/input-area.component';


@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  constructor(private dialog: DialogService, public context: Context) {
  }
  isAdmin() {
    return this.context.isAllowed(Roles.admin);
  }

  users = this.context.for(Users).gridSettings({
    allowCRUD: this.context.isAllowed(Roles.admin),
    // allowDelete: false,
    // allowInsert: false,
    // allowUpdate: false,
    // allowApiDelete: false,
    // allowApiRead: context.isSignedIn(),
    // allowApiUpdate: context.isSignedIn(),
    // allowApiInsert: Roles.admin,
    numOfColumnsInGrid: 10,// this.users.settings.columnSettings.length,
    get: {
      orderBy: h => [h.name],
      limit: 100
    },
    columnSettings: users => [
      users.name,
      users.mobile,
      users.isDriver,
      users.isMatcher,
      users.isUsher,
      users.isAdmin
    ],
    rowButtons: [{
      name: 'Set New Password',
      icon: 'password',
      click: async (u) => {
        let password = new PasswordColumn();
        let confirmPassword = new PasswordColumn({ caption: "Confirm Password" });
        this.context.openDialog(InputAreaComponent, i => i.args = {
          title: `Set New Password To: ${u.name.value}`,
          columnSettings: () => [
            password,
            confirmPassword,
          ],
          ok: async () => {
            if (password.value != confirmPassword.value) {
              confirmPassword.validationError = "doesn't match password";
              throw new Error(confirmPassword.defs.caption + " " + confirmPassword.validationError);
            }
            await u.create(password.value);
          },
        });
      }
    }],
    confirmDelete: async (h) => {
      return await this.dialog.confirmDelete(h.name.value)
    },
  });

  @ServerFunction({ allowed: Roles.admin })
  static async resetPassword(userId: string, context?: Context) {
    let u = await context.for(Users).findId(userId);
    if (u) {
      u.password.value = '';
      await u.save();
    }
  }
  
  ngOnInit() {
  }
  
}
