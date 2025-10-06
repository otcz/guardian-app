import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { RolesListComponent } from '../roles-list-component/roles-list.component';

@Component({
  selector: 'app-roles-create-page',
  standalone: true,
  imports: [RolesListComponent],
  templateUrl: './roles-create-page.component.html',
  styleUrls: ['./roles-create-page.component.scss']
})
export class RolesCreatePageComponent implements AfterViewInit {
  @ViewChild(RolesListComponent) list?: RolesListComponent;
  ngAfterViewInit(): void {
    setTimeout(() => this.list?.startAdd(), 0);
  }
}

