import { Injectable } from "@angular/core";
import { BoolColumn, Context, EntityClass, IdEntity, NumberColumn } from "@remult/core";
import { Roles } from "../../users/roles";

@EntityClass
export class ApplicationSettings extends IdEntity {

    constructor() {
        super({
            name: "settings",
            allowApiCRUD: Roles.admin,
            allowApiRead: c => c.isSignedIn(),
        });
    }

    //מספר הדקות כמקדם לשעת ביקור בין השעות של המתנדב לשעת הביקור - להצגת נסיעה אפשרית
    ridesCoefficientToVisitHour = new NumberColumn({ defaultValue: 120 });//2 hours
    
    //מספר הימים להצגת סך נסיעות שביצע מתנדב - התאמת נהג בסדרן
    numOfDaysToRetrieveDriverRides = new NumberColumn({ defaultValue: 30 });

    //מספר הימים להראות בחלון סדרן - היום בוקר היום צהריים ומחר בוקר ומחר צהריים
    numOfDaysToShowOnRides = new NumberColumn({ defaultValue: 2 });

    //השעה (מתוך 24) שמהוה גבול בין בוקר לצהריים 
    delimiterAfternoonHour = new NumberColumn({ defaultValue: 12 });

    //השעה (מתוך 24) שמהוה גבול בין בוקר לצהריים 
    allowPublishMessages = new BoolColumn({ defaultValue: false });

    //משפר מושבים שפנויים להסעה (לא כולל נהג)
    defaultNumOfSeatsInDriver = new NumberColumn({ defaultValue: 3});

}
 
@Injectable()
export class SettingsService {
  constructor(private context: Context){}
  
  instance: ApplicationSettings;
  async init() {
    this.instance = await this.context.for(ApplicationSettings).findFirst();
  }
}