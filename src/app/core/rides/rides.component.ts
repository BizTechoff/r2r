import { Component, OnInit } from '@angular/core';
import { Context, DataAreaSettings } from '@remult/core';
import { DialogService } from '../../common/dialog';
import {  Usher } from '../usher/usher';
import { ByDate, ByDateColumn } from "../usher/ByDate";
import { Ride } from './ride';

@Component({
  selector: 'app-rides',
  templateUrl: './rides.component.html',
  styleUrls: ['./rides.component.scss']
})
export class RidesComponent implements OnInit {

  ridesSettings = this.context.for(Ride).gridSettings({
    allowCRUD: true,
    where: r =>
      this.byDate.value.filter(r.date)

  });
  byDate = new ByDateColumn({
    valueChange:()=>this.ridesSettings.reloadData()
  });//(ByDate.today);



  constructor(private context: Context, private snakebar: DialogService) { }

  ngOnInit() {
  }

  async assign() {
    this.snakebar.info("Starting assignment..")
    let count = await Usher.organize(
      this.byDate.value,
      this.context,
    );
    if (count > 0) {
      this.ridesSettings.initOrigList();
      // this.refresh();
    }
    this.snakebar.info(`Assigned ${count} rides.`)
  }

}
