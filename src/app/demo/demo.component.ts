import { Component, OnInit } from '@angular/core';
import { Context, DateColumn, DateTimeColumn, Entity, GridSettings, InMemoryDataProvider, ServerController, ServerMethod, StringColumn } from '@remult/core';
import { LocationIdColumn } from '../core/locations/location';
import { SetDriverComponent } from '../core/usher/set-driver/set-driver.component';
import { SuggestDriverComponent } from '../core/usher/suggest-driver/suggest-driver.component';

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
    this.context.openDialog(SetDriverComponent, x => x.args =
    {
      "date": new Date("2021-04-27T00:00:00.000Z"),
      "from": "da2dac14-60bb-48b7-a813-6f99e0abaf2d",
      "to": "1f50c54e-59b5-454f-8f01-c9adfa35add1"

    });
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