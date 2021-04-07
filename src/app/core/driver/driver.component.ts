import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings } from '@remult/core';
import { Driver } from './driver';

@Component({
  selector: 'app-driver',
  templateUrl: './driver.component.html',
  styleUrls: ['./driver.component.scss']
})
export class DriverComponent implements OnInit {

  driver = this.context.for(Driver).create();
  driverSettings = new DataAreaSettings({
    columnSettings: () => [
      this.driver.name,
      this.driver.mobile,
    ]});

  constructor(private context: Context) { }

  ngOnInit() {
  }

  async submit(){
    await this.driver.save();
  }

}
