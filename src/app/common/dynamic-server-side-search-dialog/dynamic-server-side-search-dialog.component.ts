import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { BusyService } from '@remult/angular';
import { AndFilter, Context, Entity, EntityType, EntityWhere, EntityWhereItem, SpecificEntityHelper, StringColumn } from '@remult/core';

@Component({
  selector: 'app-dynamic-server-side-search-dialog',
  template: `
<h1 mat-dialog-title>Select {{title}}</h1>

<div mat-dialog-content>
    <form (submit)="selectFirst()">
        <mat-form-field>
            <input matInput [(ngModel)]="searchString.value" [ngModelOptions]="{standalone: true}"> 
        </mat-form-field>
    </form>
    <mat-nav-list role="list" *ngIf="items">
        <ng-container *ngFor="let o of items">
            <mat-list-item role="listitem" style="height:36px"
                 (click)="select(o)">
                {{_args.searchColumn(o).value}}
            </mat-list-item>
            <mat-divider ></mat-divider>
        </ng-container>
    </mat-nav-list>
</div>
<div mat-dialog-actions>

    <button mat-icon-button mat-dialog-close title="Clear Selection"  (click)="clear()">
        <mat-icon>clear</mat-icon>
    </button>
</div>    `,
  styles: []
})
export class DynamicServerSideSearchDialogComponent implements OnInit {


  constructor(private context: Context, private busy: BusyService, private dialogRef: MatDialogRef<any>) { }
  items: Entity[] = [];
  ngOnInit() {
    this.loadProducts();
  }
  async loadProducts() {
    this.items = await this.entityContext.find({
      where:[ p =>
        // if there is a search value, search by it
        
        this.searchString.value ? this._args.searchColumn(p).isContains(this.searchString)
          : undefined
    ]}); 
  }

  searchString = new StringColumn({
    caption: 'search',
    valueChange: async () => {
      // the call to `this.busy.donotWait` causes the load products method to run without the "Busy" circle in the ui
      await this.busy.donotWait(async () => await this.loadProducts());
    }
  })

  entityContext: SpecificEntityHelper<any, Entity>;
  _args: dynamicSearchDialog<any>;
  title: string;

  args<entity extends Entity>(entityType: {
    new(...args: any[]): entity
  }, args: dynamicSearchDialog<entity>) {
    this._args = args;
    this.entityContext = this.context.for(entityType);
    this.title = this.entityContext.create().defs.caption;

  }
  clear(){
    this._args.onClear();
    this.dialogRef.close();
  }
  select(p: Entity) {
    this._args.onSelect(p);
    this.dialogRef.close();
  }
  selectFirst() {
    if (this.items.length > 0)
      this.select(this.items[0]);
  }

}
export interface dynamicSearchDialog<T extends Entity> {
  onClear?: () => void;
  onSelect: (item: T) => void;
  searchColumn: (item: T) => StringColumn;
  where?:EntityWhereItem<T>;

}