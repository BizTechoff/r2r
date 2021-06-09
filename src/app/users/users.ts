
import { Allowed, BoolColumn, checkForDuplicateValue, ColumnOptions, ColumnSettings, Context, EntityClass, IdColumn, IdEntity, ServerMethod, StringColumn } from "@remult/core";
import { Driver } from "../core/drivers/driver";
import { changeDate, TODAY } from '../shared/types';
import { addDays } from "../shared/utils";
import { Roles } from './roles';

@EntityClass
export class Users extends IdEntity {



    name = new StringColumn({
        caption: "name",
        // validate: () => {

        //     if (!this.name.value || this.name.value.length < 2)
        //         this.name.validationError = 'Name is too short';
        // }
    });
    password = new PasswordColumn({
        includeInApi: false
    });
    createDate = new changeDate('Create Date');

    isAdmin = new BoolColumn({ defaultValue: false, allowApiUpdate: Roles.admin });
    isUsher = new BoolColumn({ defaultValue: false, allowApiUpdate: Roles.admin });
    isMatcher = new BoolColumn({ defaultValue: false, allowApiUpdate: Roles.admin });
    isDriver = new BoolColumn({ defaultValue: false, allowApiUpdate: Roles.admin });

    mobile = new StringColumn({
        validate: () => {
            if (!this.mobile.value || this.mobile.value.length < 2)
                this.mobile.validationError = ' Mobile is too short';
        }
    });

    constructor(private context: Context) {

        super({
            name: "Users",
            allowApiDelete: false,
            allowApiRead: context.isSignedIn(),
            allowApiUpdate: context.isSignedIn(),
            allowApiInsert: Roles.admin,

            saving: async () => {
                if (context.onServer) {
                    if (this.isNew()) {
                        this.createDate.value = addDays(TODAY);
                        if ((await context.for(Users).count()) == 0) {
                            this.isAdmin.value = true;// If it's the first user, make it an admin
                        }
                        this.password.value = PasswordColumn.passwordHelper.generateHash('Q1w2e3r4');
                        // else {
                        //     this.isDriver.value = true;
                        // }
                    }
                    await checkForDuplicateValue(this, this.mobile, this.context.for(Users));

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

                    if (user.isDriver.value) {//only if user is driver
                        if (d.isNew() || (!(d.userId.value == user.id.value))) {
                            d.name.value = user.name.value;
                            d.mobile.value = user.mobile.value;
                            d.userId.value = user.id.value;
                            d.seats.value = 4;
                            await d.save();
                        }
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
    @ServerMethod({ allowed: Roles.admin })//user can created only inside platform (the server)
    async create(password: string) {
        // if (!this.isNew())
        //     throw "Invalid Operation";
        this.password.value = PasswordColumn.passwordHelper.generateHash(password);
        // console.log(1);
        try { await this.save(); }
        catch (error) {
            console.log(error);
        }

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

