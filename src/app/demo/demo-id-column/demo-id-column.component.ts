import { Component, OnInit } from '@angular/core';
import { SelectValueDialogComponent } from '@remult/angular';
import { Context, DataAreaSettings, StringColumn } from '@remult/core';
import { Driver } from '../../core/driver/driver';
import { SelectDriverComponent } from '../select-driver/select-driver.component';


@Component({
  selector: 'app-demo-id-column',
  templateUrl: './demo-id-column.component.html',
  styleUrls: ['./demo-id-column.component.scss']
})
export class DemoIdColumnComponent implements OnInit {

  constructor(
    private context: Context

  ) { }
  a = new StringColumn("the cool driver");
  area = new DataAreaSettings({
    columnSettings: () => [
      {
        column: this.a,
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
        valueList: this.context.for(Driver).getValueList({
          captionColumn: d => d.name
        })
      },
      {
        column: this.a,
        getValue: () => this.context.for(Driver).lookup(this.a).name.value,
        clickIcon: 'search',
        //hideDataOnInput: true,
        click: () => {


          // this.context.openDialog(SelectValueDialogComponent,
          //   x => x.args({
          //     values:[{ caption: 'noam' }, { caption: 'moti' }],
          //     onSelect:x=>{}
          //   }))
          this.context.openDialog(SelectDriverComponent, x => x.args = {
            onSelect: (selectedDriverId) =>
              this.a.value = selectedDriverId
          });

        }
      }
    ]
  })
  drivers = this.context.for(Driver).gridSettings({
    allowCRUD: true,
    columnSettings: d => [d.id, d.name]
  });
  getDrier() {

    //use lookup only for presentation purposes knowing that it'll always return a driver, and an empty driver for the first time
    //relies on the fact that it is used for rendering
    return this.context.for(Driver).lookup(this.a);
    // for business logic use await findFirst/ await findId (without cache) or await lookupAsync (with cache)

  }

  ngOnInit() {
  }

}
