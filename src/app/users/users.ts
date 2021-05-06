
import { Allowed, BoolColumn, checkForDuplicateValue, ColumnOptions, ColumnSettings, Context, EntityClass, IdColumn, IdEntity, ServerMethod, StringColumn } from "@remult/core";
import { Driver } from "../core/drivers/driver";
import { changeDate } from '../shared/types';
import { Roles } from './roles';

@EntityClass
export class Users extends IdEntity {

    

    name = new StringColumn({
        caption: "name",
        validate: () => {

            if (!this.name.value || this.name.value.length < 2)
                this.name.validationError = 'Name is too short';
        }
    });
    password = new PasswordColumn({
        includeInApi: false
    });
    createDate = new changeDate('Create Date');

    isAdmin = new BoolColumn({ allowApiUpdate: Roles.admin });
    isUsher = new BoolColumn({ allowApiUpdate: Roles.admin });
    isMatcher = new BoolColumn({ allowApiUpdate: Roles.admin });
    isDriver = new BoolColumn({ allowApiUpdate: Roles.admin });

    mobile?= new StringColumn();
 
    constructor(private context: Context) {

        super({
            name: "Users",
            allowApiRead: context.isSignedIn(),
            allowApiDelete: Roles.admin,
            allowApiUpdate: context.isSignedIn(),
            allowApiInsert: Roles.admin,

            saving: async () => {
                if (context.onServer) {

                    if (this.isNew()) {
                        this.createDate.value = new Date();
                        if ((await context.for(Users).count()) == 0) {
                            this.isAdmin.value = true;// If it's the first user, make it an admin
                        }
                        else {
                            this.isDriver.value = true;
                        }
                    }
                    await checkForDuplicateValue(this, this.name, this.context.for(Users));

                }
            },
            saved: async () => {
                if (context.onServer) {
                    await this.updateEntityForUserByRole(
                        Roles.driver, this, true,
                    );
                }
            },
            deleted: async () => {
                if (context.onServer) {
                    await this.deleteEntityForUserByRole(
                        Roles.driver, this.id.value,
                    );
                }
            },
            apiDataFilter: () => {
                if (!(context.isAllowed(Roles.admin)))
                    return this.id.isEqualTo(this.context.user.id);
            },

        });
    }

    private async updateEntityForUserByRole(role: Allowed, user: Users, createIfNotExists = false) {
        if (user && user.id.value.length > 0) {

            switch (role.valueOf()) {

                case Roles.driver: {

                    let d = await this.context.for(Driver).findOrCreate({
                        where: d => d.userId.isEqualTo(user.id)
                    });

                    if (user.isDriver.value) {//need driver also
                        // 'refresh' his name & mobile if changed
                        d.name.value = user.name.value;
                        d.mobile.value = user.mobile.value;
                        await d.save();
                    }
                    else if (!(d.isNew())) {
                        // 'delete' it
                        d.userId.value = '';
                        await d.save();
                    }
 
                    break;
                }
            }
        }
    }

    private async createEntityForUserByRole(role: Allowed, user: Users) {
        switch (role.valueOf()) {

            case Roles.driver: {
                if (user.isDriver.value) {
                    const d = this.context.for(Driver).create();
                    d.userId.value = user.id.value;
                    d.name.value = user.name.value;
                    d.mobile.value = user.mobile.value;
                    await d.save();
                }
                break;
            }
        }
    }

    private async deleteEntityForUserByRole(role: Allowed, userId: string) {
        if (userId && userId.length > 0) {

            switch (role.valueOf()) {

                case Roles.driver: {
                    let d = await this.context.for(Driver).findFirst({ where: d => d.userId.isEqualTo(userId) });
                    if (d) {
                        await d.delete();
                    }
                }
            }
        }
    }

    // to remove
    @ServerMethod({ allowed: true })//user can created only inside platform (the server)
    async create(password: string) {
        if (!this.isNew())
            throw "Invalid Operation";
        this.password.value = PasswordColumn.passwordHelper.generateHash(password);
        await this.save();

        // await this.createEntityForUserByRole(Roles.driver, this);
    }

    @ServerMethod({ allowed: context => context.isSignedIn() })
    async updatePassword(password: string) {
        if (this.isNew() || this.id.value != this.context.user.id)
            throw "Invalid Operation";
        this.password.value = PasswordColumn.passwordHelper.generateHash(password);
        await this.save();
    }
}



export class UserId extends IdColumn {

    constructor(private context: Context, settingsOrCaption?: ColumnOptions<string>) {
        super({
            dataControlSettings: () => ({
                getValue: () => this.displayValue,
                hideDataOnInput: true,
                width: '200'
            })
        }, settingsOrCaption);
    }
    get displayValue() {
        return this.context.for(Users).lookup(this).name.value;
    }
}
export class PasswordColumn extends StringColumn {

    constructor(settings?: ColumnSettings<string>) {
        super({
            ...{ caption: 'Password' },
            ...settings,
            dataControlSettings: () => ({
                inputType: 'password'
            })
        })
    }
    static passwordHelper: {
        generateHash(password: string): string;
        verify(password: string, realPasswordHash: string): boolean;
    };
}

