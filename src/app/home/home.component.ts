import { Component, OnInit } from '@angular/core';
import { Context } from '@remult/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(public context:Context) { }

  ngOnInit() {
  }
}
