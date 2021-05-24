import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, DateTimeColumn, Entity, GridSettings, InMemoryDataProvider, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { LocationIdColumn } from '../core/locations/location';

@Component({
  selector: 'app-demo',
  templateUrl: './demo.component.html',
  styleUrls: ['./demo.component.scss']
})
export class DemoComponent implements OnInit {

  constructor(private context: Context) { }
  x = new rideSomething(this.context);
  persons: person[] = [{ firstName: 'moti', lastName: 'drukman' }, { firstName: 'Nopam', lastName: 'honig' }]
  grid: GridSettings;
  mem = new InMemoryDataProvider();
  ngOnInit() {
    this.mem.rows["PersonEntity"] = this.persons;
    this.grid = this.context.for(PersonEntity, this.mem).gridSettings({ allowCRUD: true });

  }

}

interface person {
  firstName: string;
  lastName: string;
}
class PersonEntity extends Entity {
  firstName = new StringColumn();
  lastName = new StringColumn();

}
@ServerController({ key: 'rodeController', allowed: true })
class rideSomething {
  selectedDate = new DateColumn();
  firstName = new StringColumn();
  lastName = new StringColumn();
  constructor(private context: Context) {

  }
  @ServerMethod()
  async doSomething() {

  //  DateTimeColumn.stringToDate();
    console.log({
      last: this.lastName.value,
      first: this.lastName
      , date: this.selectedDate.value
    });
  }

}