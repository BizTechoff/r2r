import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';
import { Ride, RideStatus } from './ride';

@Component({
  selector: 'app-rides',
  templateUrl: './rides.component.html',
  styleUrls: ['./rides.component.scss']
})
export class RidesComponent implements OnInit {

  ridesSettings = this.context.for(Ride).gridSettings({
    allowCRUD: true,
  });

  constructor(private context: Context) { }

  ngOnInit() {
  }

}
