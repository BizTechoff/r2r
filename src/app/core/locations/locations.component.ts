import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import {Location} from './location'

@Component({
  selector: 'app-locations',
  templateUrl: './locations.component.html',
  styleUrls: ['./locations.component.scss']
})
export class LocationsComponent implements OnInit {

  locationsSettings = this.context.for(Location).gridSettings({
    allowCRUD: true,
    // columnSettings: ()=>[

    // ],
  });
  
  constructor(private context: Context) { }

  ngOnInit() {
  }

}
