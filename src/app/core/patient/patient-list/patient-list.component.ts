import { Component, OnInit } from '@angular/core';
import { Column, Context, DataAreaSettings, Role, StringColumn } from '@remult/core';
import { Roles } from '../../../users/roles';
import { Patient } from '../patient';
import { PatientComponent } from '../patient.component';

@Component({
  selector: 'app-patient-list',
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.scss']
})
export class PatientListComponent implements OnInit {

  search = new StringColumn({caption: "חיפוש חולה"});
  searchSettings = new DataAreaSettings({
    columnSettings: () => [
      {
        column: this.search,
        clickIcon: 'search',
        //longest
        // valueList: async () => {
        //   var result: { id: string, caption: string }[] = [];
        //   for (const d of await this.context.for(Driver).find()) {
        //     result.push({ id: d.id.value, caption: d.name.value });
        //   }
        //   return result;
        // }
        //middle
        // valueList: async () => 
        //    (await this.context.for(Driver).find())
        //   .map(driver=>({

        //     id:driver.id.value,
        //     caption:driver.name.value
        //   }))


        // shortest
        valueList: this.context.for(Patient).getValueList({
          captionColumn: d => d.name
        })
      },
      // {
      //   column: this.a,
      //   getValue: () => this.context.for(Driver).lookup(this.a).name.value,
      //   clickIcon: 'search',
      //   //hideDataOnInput: true,
      //   click: () => {


      //     // this.context.openDialog(SelectValueDialogComponent,
      //     //   x => x.args({
      //     //     values:[{ caption: 'noam' }, { caption: 'moti' }],
      //     //     onSelect:x=>{}
      //     //   }))
      //     this.context.openDialog(SelectDriverComponent, x => x.args = {
      //       onSelect: (selectedDriverId) =>
      //         this.a.value = selectedDriverId
      //     });

      //   }
      // }
    ]
  })

  patients: Patient[] = [];
  patientsSettings = this.context.for(Patient).gridSettings({
    allowCRUD: true,
    columnSettings: (p) => [
      p.name,
      p.mobile,
      p.defaultBorderCrossing,
      p.defaultHospital,
    ],
    rowButtons: [{
      name: "צור בקשת הסעה",
      click: async (p) => await this.openNewDrivingDialog(p),
      icon: "rv_hookup",
      visible: (p) => p && p.id && p.id.value && p.id.value.length > 0,
    }],
  });


  constructor(private context: Context) { 
    // super({});
  }

  ngOnInit() {
    this.retrieve();
  }

  async retrieve() {
    this.patients = await this.context.for(Patient).find();
  }

  async openNewDrivingDialog(p: Patient) {

    await this.context.openDialog(
      PatientComponent,
      x => x.args = {
        patient: p,
      },


      // this.context.openDialog(SelectDriverComponent,x=>x.args={
      //   onSelect:(selectedDriverId)=>
      //   this.a.value = selectedDriverId
      // });
    )
  }

}

