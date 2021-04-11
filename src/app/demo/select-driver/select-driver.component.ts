import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DialogConfig } from '@remult/angular';
import { Context } from '@remult/core';
import { Driver } from '../../core/driver/driver';

@DialogConfig({
  minWidth:'95%'
})
@Component({
  selector: 'app-select-driver',
  templateUrl: './select-driver.component.html',
  styleUrls: ['./select-driver.component.scss']
})
export class SelectDriverComponent implements OnInit {

  constructor(private context:Context,private d:MatDialogRef<any>) { }
  drivers:Driver[];
  args:{
    onSelect:(selectedDriverId:string)=>void
  }
  async ngOnInit() {
    this.drivers = await this.context.for(Driver).find();
  }
  click(d:Driver){
    this.args.onSelect(d.id.value);
    this.d.close();

  }

}
