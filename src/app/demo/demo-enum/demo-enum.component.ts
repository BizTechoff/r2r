import { Component, OnInit } from '@angular/core';
import { DataAreaSettings, StringColumn } from '@remult/core';

@Component({
  selector: 'app-demo-enum',
  templateUrl: './demo-enum.component.html',
  styleUrls: ['./demo-enum.component.scss']
})
export class DemoEnumComponent implements OnInit {
  a = new StringColumn();
  area = new DataAreaSettings({
    columnSettings:()=>[this.a]
  });
  constructor() { }

  ngOnInit() {
  }

}
