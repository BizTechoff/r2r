import { IdEntity, NumberColumn } from "@remult/core";

export class ApplicationSettings extends IdEntity{

    //מספר הדקות לסטייה בין השעות של המתנדב לשעת הנסיעה - להצגת נסיעה אפשרית
    matchingDiffMinutes = new NumberColumn({defaultValue: 30});

    //מספר הימים להצגת סך נסיעות שביצע מתנדב - התאמת נהג בסדרן
    numOfDaysToRetrieveDriverRides = new NumberColumn({defaultValue: 30});

    //מספר הימים להראות בחלון סדרן - היום בוקר היום צהריים ומחר בוקר ומחר צהריים
    numOfDaysToShowOnRides = new NumberColumn({defaultValue: 2});

    //השעה (מתוך 24) שמהוה גבול בין בוקר לצהריים 
    delimiterAfternoonHour = new NumberColumn({defaultValue: 12});

}
