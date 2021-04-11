import { Component, OnInit } from '@angular/core';
import { DataAreaSettings, StringColumn } from '@remult/core';

@Component({
  selector: 'app-demo-one',
  templateUrl: './demo-one.component.html',
  styleUrls: ['./demo-one.component.scss']
})
export class DemoOneComponent implements OnInit {
  a = new StringColumn();
  b = new myColumn();

  area = new DataAreaSettings({
    columnSettings: () => [
      this.a,
      {
        column: this.a,
        valueList: [{ id: '1', caption: 'noam' }, { id: '2', caption: 'moti' }]
      },
      this.b
    ]
  });
  constructor() { }

  ngOnInit() {
  }

}


class myColumn extends StringColumn {

  constructor() {
    super({
      dataControlSettings: () => ({
        valueList: [{ id: 'TLV', caption: 'Tel Aviv' }, { id: 'NY', caption: 'New York' }]
      })
    });
  }
}
class PhoneColumn extends StringColumn {
  constructor() {
    super({
      inputType: 'tel',
      
      dataControlSettings:()=>({
        click:()=>window.open('tel:'+this.value),
        clickIcon:'phone'
      })
    });
  }
}