import { Component, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { ActivatedRoute, Route, Router } from '@angular/router';
import { RouteHelperService } from '@remult/angular';
import { Context, JwtSessionService, ServerFunction, StringColumn, UserInfo } from '@remult/core';
import { DialogService } from './common/dialog';
import { InputAreaComponent } from './common/input-area/input-area.component';
import { Roles } from './users/roles';
import { PasswordColumn, Users } from './users/users';



@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {


  constructor(
    public router: Router,
    public activeRoute: ActivatedRoute,
    private routeHelper: RouteHelperService,
    public dialogService: DialogService,
    private session: JwtSessionService,
    public context: Context) {
    session.loadUserInfo();
  }

  async signIn() {
    let mobile = new StringColumn({ caption: 'Mobile' });
    this.context.openDialog(InputAreaComponent, i => i.args = {
      title: "Sign In",
      columnSettings: () => [
        mobile,
      ],
      ok: async () => {
        let needPw = await AppComponent.isSpecial(mobile.value);
        if (needPw == undefined) {
          this.dialogService.error("User not found, please contact Avishai");
        }
        else if (needPw == false) {
          this.session.setToken(await AppComponent.signIn(mobile.value, ''));
        }
        else {
          let password = new PasswordColumn();
          this.context.openDialog(InputAreaComponent, i => i.args = {
            title: "Sign In",
            columnSettings: () => [
              password,
            ],
            ok: async () => {
              this.session.setToken(await AppComponent.signIn(mobile.value, password.value));
            },
          });
        }
      }
    });
  }

  @ServerFunction({ allowed: true })
  static async isSpecial(mobile: string, context?: Context) {
    let u = await context.for(Users).findFirst(usr => usr.mobile.isEqualTo(mobile));
    if (u) {
      // he is driver and not anything else (prevent see all sidebar-menu)
      let onlyDriver = (u.isDriver.value) && (!(u.isAdmin.value || u.isUsher.value || u.isMatcher.value));
      if (onlyDriver) {
        return false;
      }
      return true;
    }
    return undefined;
  }

  @ServerFunction({ allowed: true })
  static async signIn(mobile: string, password: string, context?: Context) {
    let result: UserInfo;
    let u = await context.for(Users).findFirst(usr => usr.mobile.isEqualTo(mobile));
    if (u) {
      if (u.isDriver.value || !u.password.value || PasswordColumn.passwordHelper.verify(password, u.password.value)) {
        //if (u.isDriver ||  !u.password.value || PasswordColumn.passwordHelper.verify(password, u.password.value)) {
        result = {
          id: u.id.value,
          roles: [],
          name: u.name.value
        };
        if (u.isAdmin.value) {
          result.roles.push(Roles.admin);
        }
        if (u.isUsher.value) {
          result.roles.push(Roles.usher);
        }
        if (u.isMatcher.value) {
          result.roles.push(Roles.matcher);
        }
        if (u.isDriver.value) {
          result.roles.push(Roles.driver);
        }
      }
    }
    if (result) {
      return JwtSessionService.createTokenOnServer(result);
    }
    throw new Error("Invalid Sign In Info");
  }

  signOut() {
    this.session.signout();
    this.router.navigate(['/']);
  }
  signUp() {
    let user = this.context.for(Users).create();
    let password = new PasswordColumn();
    let confirmPassword = new PasswordColumn({ caption: "Confirm Password" });
    this.context.openDialog(InputAreaComponent, i => i.args = {
      title: "Sign Up",
      columnSettings: () => [
        user.name,
        password,
        confirmPassword
      ],
      ok: async () => {
        if (password.value != confirmPassword.value) {
          confirmPassword.validationError = "doesn't match password";
          throw new Error(confirmPassword.defs.caption + " " + confirmPassword.validationError);
        }
        await user.create(password.value);
        this.session.setToken(await AppComponent.signIn(user.name.value, password.value));

      }
    });
  }

  async updateInfo() {
    let user = await this.context.for(Users).findId(this.context.user.id);
    this.context.openDialog(InputAreaComponent, i => i.args = {
      title: "Update Info",
      columnSettings: () => [
        user.name,
        // user.mobile,//visible=Roles.driver | Roles.matcher
      ],
      ok: async () => {
        await user.save();
      }
    });
  }
  async changePassword() {
    let user = await this.context.for(Users).findId(this.context.user.id);
    let password = new PasswordColumn();
    let confirmPassword = new PasswordColumn({ caption: "Confirm Password" });
    this.context.openDialog(InputAreaComponent, i => i.args = {
      title: "Change Password",
      columnSettings: () => [
        password,
        confirmPassword
      ],
      ok: async () => {
        if (password.value != confirmPassword.value) {
          confirmPassword.validationError = "doesn't match password";
          throw new Error(confirmPassword.defs.caption + " " + confirmPassword.validationError);
        }
        await user.updatePassword(password.value);
        await user.save();
      }
    });

  }

  routeName(route: Route) {
    let name = route.path;
    if (route.data && route.data.name)
      name = route.data.name;
    return name;
  }

  currentTitle() {
    if (this.activeRoute && this.activeRoute.snapshot && this.activeRoute.firstChild)
      if (this.activeRoute.firstChild.data && this.activeRoute.snapshot.firstChild.data.name) {
        return this.activeRoute.snapshot.firstChild.data.name;
      }
      else {
        if (this.activeRoute.firstChild.routeConfig)
          return this.activeRoute.firstChild.routeConfig.path;
      }
    return 'roadtorecovery-app';
  }

  shouldDisplayRoute(route: Route) {
    if (!(route.path && route.path.indexOf(':') < 0 && route.path.indexOf('**') < 0))
      return false;
    return this.routeHelper.canNavigateToRoute(route);
  }

  //@ts-ignore ignoring this to match angular 7 and 8
  @ViewChild('sidenav') sidenav: MatSidenav;
  routeClicked() {
    if (this.dialogService.isScreenSmall())
      this.sidenav.close();

  }

}
