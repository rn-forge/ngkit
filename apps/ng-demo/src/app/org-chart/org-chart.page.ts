import { Component, ViewChild } from '@angular/core';
import { TableComponent, TableOptions } from '@rn-forge/ng-bootstrap';

const ORG_DATA = [
  { id: 1, pid: 0, name: 'Engineering', type: 'Department', head: 'Jane Doe' },
  { id: 2, pid: 1, name: 'Frontend', type: 'Team', head: 'Alice Johnson' },
  { id: 3, pid: 1, name: 'Backend', type: 'Team', head: 'Bob Smith' },
  { id: 4, pid: 2, name: 'Alice Johnson', type: 'Member', head: '-' },
  { id: 5, pid: 2, name: 'Charlie Brown', type: 'Member', head: '-' },
  { id: 6, pid: 3, name: 'Bob Smith', type: 'Member', head: '-' },
  { id: 7, pid: 3, name: 'Diana Prince', type: 'Member', head: '-' },
  { id: 8, pid: 0, name: 'Design', type: 'Department', head: 'Eve Davis' },
  { id: 9, pid: 8, name: 'UX', type: 'Team', head: 'Eve Davis' },
  { id: 10, pid: 9, name: 'Eve Davis', type: 'Member', head: '-' },
];

@Component({
  selector: 'app-org-chart-page',
  standalone: true,
  imports: [TableComponent],
  templateUrl: './org-chart.page.html',
})
export class OrgChartPageComponent {
  @ViewChild('table') table!: TableComponent;

  options: Partial<TableOptions> = {
    columns: [
      { field: 'name', title: 'Name', sortable: false },
      { field: 'type', title: 'Type', sortable: false },
      { field: 'head', title: 'Head', sortable: false },
    ],
    data: ORG_DATA,
    idField: 'id',
    treeEnable: true,
    treeShowField: 'name',
    parentIdField: 'pid',
    rootParentId: '0',
    pagination: false,
    search: false,
    stickyHeader: false,
    clickToSelect: false,
    showRefresh: false,
    showToggle: false,
    showColumns: false,
    showFullscreen: false,
    showPaginationSwitch: false,
    showFilterControlSwitch: false,
  };
}
