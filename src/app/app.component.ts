import { ThrowStmt } from '@angular/compiler';
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
  private static showConnectAsDriver = false;

  constructor(
    public router: Router,
    public activeRoute: ActivatedRoute,
    private routeHelper: RouteHelperService,
    public dialogService: DialogService,
    private session: JwtSessionService,
    public context: Context) {
    session.loadUserInfo();
  }

  async ngOnInit() {
    if (this.context) {
      if (this.context.user) {
        AppComponent.showConnectAsDriver = this.context.user.roles.length > 1 && this.context.user.roles.includes(Roles.driver);
      }
    }
  }

  async connectAsDriver() {
    let mobile = this.context.user.mobile;
    if (mobile && mobile.length > 0 && mobile.startsWith('05')) {
      await this.session.signout();
      // await this.dialogService.error("Continue");
      await this.session.setToken(await AppComponent.signIn(mobile, ''));
    }
  }

  isConnectAsDriverEnabled() {
    return AppComponent.showConnectAsDriver;
  }

  async signIn() {
    let mobile = new StringColumn({ caption: 'Mobile' });
    this.context.openDialog(InputAreaComponent, i => i.args = {
      title: "Sign In",
      columnSettings: () => [
        mobile,
      ],
      ok: async () => {
        let roles = await AppComponent.isSpecial(mobile.value);
        if (roles.length === 0) {
          this.dialogService.error("User NOT found! please contact Avishai");
        }
        else if (roles.length === 1 && roles.includes(Roles.driver)) {
          this.session.setToken(await AppComponent.signIn(mobile.value, ''));
        }
        else {//only one role: admin | usher | matcher -> So, enter password
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
  static async isSpecial(mobile: string, context?: Context): Promise<string[] /*roles*/> {
    let result: string[] = [];
    let u = await context.for(Users).findFirst(usr => usr.mobile.isEqualTo(mobile));
    if (u) {
      if (u.isAdmin.value) {
        result.push(Roles.admin);
      }
      else if (u.isUsher.value) {
        result.push(Roles.usher);
      }
      else if (u.isMatcher.value) {
        result.push(Roles.matcher);
      }
      if (u.isDriver.value) {
        result.push(Roles.driver);
      }
    }
    return result;
  }

  @ServerFunction({ allowed: true })
  static async signIn(mobile: string, password: string, context?: Context) {
    let result: UserInfo;
    let u = await context.for(Users).findFirst(usr => usr.mobile.isEqualTo(mobile));
    if (u) {
      if (u.isDriver.value || !u.password.value || PasswordColumn.passwordHelper.verify(password, u.password.value)) {
        result = {
          id: u.id.value,
          roles: [],
          name: u.name.value,
          mobile: u.mobile.value
        };
        if (u.isAdmin.value) {
          result.roles.push(Roles.admin);
        }
        else if (u.isUsher.value) {
          result.roles.push(Roles.usher);
        } 
        else if (u.isMatcher.value) {
          result.roles.push(Roles.matcher);
        }
        if (u.isDriver.value) {
          result.roles.push(Roles.driver);
        }

        AppComponent.showConnectAsDriver = result.roles.length > 1 && result.roles.includes(Roles.driver);
      }
    }
    if (result) {
      console.log(result);
      return JwtSessionService.createTokenOnServer(result);
    }
    throw new Error("Invalid Sign In Info");
  }

  signOut() {
    this.session.signout();
    this.router.navigate(['/']);
  }
  private signUp() {
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
