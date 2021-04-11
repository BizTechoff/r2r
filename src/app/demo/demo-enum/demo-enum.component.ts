import { Component, OnInit } from '@angular/core';
import { DataAreaSettings, StringColumn, ValueListColumn } from '@remult/core';

@Component({
  selector: 'app-demo-enum',
  templateUrl: './demo-enum.component.html',
  styleUrls: ['./demo-enum.component.scss']
})
export class DemoEnumComponent implements OnInit {
  a = new ValueListColumn(Status);
  area = new DataAreaSettings({
    columnSettings: () => [this.a]
  });
  constructor() { }

  ngOnInit() {
  }
  click(){
    
    if (this.a.value==Status.open){
      alert('פתוח');
    }
  }

}
export class AnotherEnum{
  static kukiriku = new AnotherEnum('val1');
  static val2 = new AnotherEnum();
  constructor(public id?:string){

  }
}

export class Status {
  static open = new Status(0, 'פתוח',);
  static closed = new Status(1, 'סגור','red');
  constructor(public id: number, public caption: string,public color='green') {

  }
}
export class StatusColumn extends ValueListColumn<Status>{
  constructor() {
    super(Status);
  }
}
