import { Component, ViewChild } from '@angular/core';
import { type Meta, type StoryObj } from '@storybook/angular';
import { TableComponent, TableOptions, ToolbarHelper } from './table.component';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  [key: string]: unknown;
}

const USERS: User[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Admin',
    status: 'Active',
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'Editor',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Carol Williams',
    email: 'carol@example.com',
    role: 'Viewer',
    status: 'Inactive',
  },
  {
    id: 4,
    name: 'David Brown',
    email: 'david@example.com',
    role: 'Editor',
    status: 'Active',
  },
  {
    id: 5,
    name: 'Eve Davis',
    email: 'eve@example.com',
    role: 'Viewer',
    status: 'Pending',
  },
  {
    id: 6,
    name: 'Frank Miller',
    email: 'frank@example.com',
    role: 'Admin',
    status: 'Active',
  },
];

const COLUMNS = [
  { checkbox: true, title: '' },
  { field: 'id', title: 'ID', sortable: true, width: 60 },
  { field: 'name', title: 'Name', sortable: true },
  { field: 'email', title: 'Email', sortable: true },
  { field: 'role', title: 'Role', sortable: true },
  { field: 'status', title: 'Status', sortable: true },
];

// ── Basic table ──────────────────────────────────────────────────────────────

@Component({
  selector: 'rnf-table-basic-demo',
  standalone: true,
  imports: [TableComponent],
  template: `<rnf-table #table [options]="options" />`,
})
class TableBasicDemo {
  @ViewChild('table') table!: TableComponent;

  options: Partial<TableOptions> = {
    columns: COLUMNS,
    data: USERS,
    pagination: false,
    search: false,
    showRefresh: false,
    showToggle: false,
    showColumns: false,
    showFullscreen: false,
    showPaginationSwitch: false,
    showFilterControlSwitch: false,
    stickyHeader: false,
  };
}

// ── Table with toolbar ───────────────────────────────────────────────────────

@Component({
  selector: 'rnf-table-toolbar-demo',
  standalone: true,
  imports: [TableComponent],
  template: `
    <rnf-table #table [options]="options" />
    @if (selected) {
      <div class="mt-2 small alert alert-info">
        Selected: {{ selected.name }} ({{ selected.email }})
      </div>
    }
  `,
})
class TableToolbarDemo {
  @ViewChild('table') table!: TableComponent;
  selected?: User;

  options: Partial<TableOptions> = {
    columns: COLUMNS,
    data: USERS,
    toolbarButtons: [
      ToolbarHelper.addButton(() => alert('Add clicked')),
      ToolbarHelper.updateButton(() => {
        const row = this.table?.getSelectedRow<User>();
        this.selected = row;
      }),
      ToolbarHelper.deleteButton(() => {
        const ids = this.table?.deleteSelectedRows();
        alert(`Deleted: ${ids.join(', ')}`);
      }),
      ToolbarHelper.downloadButton(() => alert('Download clicked')),
    ],
    pageSize: 5,
    stickyHeader: false,
  };
}

// ── Table with column filter controls ────────────────────────────────────────

@Component({
  selector: 'rnf-table-filter-demo',
  standalone: true,
  imports: [TableComponent],
  template: `<rnf-table #table [options]="options" />`,
})
class TableFilterDemo {
  @ViewChild('table') table!: TableComponent;

  options: Partial<TableOptions> = {
    columns: [
      { checkbox: true, title: '' },
      {
        field: 'name',
        title: 'Name',
        sortable: true,
        filterControl: 'input',
      },
      {
        field: 'role',
        title: 'Role',
        sortable: true,
        filterControl: 'select',
      },
      {
        field: 'status',
        title: 'Status',
        sortable: true,
        filterControl: 'select',
      },
    ],
    data: USERS,
    filterControl: true,
    filterControlVisible: true,
    showFilterControlSwitch: true,
    stickyHeader: false,
    pageSize: 10,
    pagination: false,
  };
}

// ── Tree table ────────────────────────────────────────────────────────────────

const TREE_DATA = [
  { id: 1, pid: 0, name: 'Engineering', type: 'Department' },
  { id: 2, pid: 1, name: 'Frontend', type: 'Team' },
  { id: 3, pid: 1, name: 'Backend', type: 'Team' },
  { id: 4, pid: 2, name: 'Alice Johnson', type: 'Member' },
  { id: 5, pid: 2, name: 'Bob Smith', type: 'Member' },
  { id: 6, pid: 3, name: 'Carol Williams', type: 'Member' },
  { id: 7, pid: 0, name: 'Design', type: 'Department' },
  { id: 8, pid: 7, name: 'Eve Davis', type: 'Member' },
];

@Component({
  selector: 'rnf-table-tree-demo',
  standalone: true,
  imports: [TableComponent],
  template: `<rnf-table #table [options]="options" />`,
})
class TableTreeDemo {
  @ViewChild('table') table!: TableComponent;

  options: Partial<TableOptions> = {
    columns: [
      { field: 'name', title: 'Name', sortable: false },
      { field: 'type', title: 'Type', sortable: false },
    ],
    data: TREE_DATA,
    treeEnable: true,
    treeShowField: 'name',
    parentIdField: 'pid',
    rootParentId: '0',
    idField: 'id',
    pagination: false,
    search: false,
    showRefresh: false,
    showToggle: false,
    showColumns: false,
    showFullscreen: false,
    showPaginationSwitch: false,
    showFilterControlSwitch: false,
    stickyHeader: false,
    clickToSelect: false,
  };
}

// ── Storybook meta ────────────────────────────────────────────────────────────

const meta: Meta<TableBasicDemo> = {
  title: 'Components/Table',
  component: TableBasicDemo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
\`TableComponent\` wraps [bootstrap-table](https://bootstrap-table.com/) and exposes
an imperative API for loading, updating, and selecting rows. Configuration is passed
via \`[options]\`.

\`\`\`ts
@ViewChild('table') table!: TableComponent;

options: Partial<TableOptions> = {
  columns: [{ field: 'name', title: 'Name', sortable: true }],
  toolbarButtons: [
    ToolbarHelper.addButton(() => this.onAdd()),
    ToolbarHelper.updateButton(() => this.onUpdate()),
    ToolbarHelper.deleteButton(() => this.onDelete()),
  ],
};
\`\`\`

\`ToolbarHelper\` provides standard toolbar button factories (\`addButton\`, \`updateButton\`,
\`deleteButton\`, \`uploadButton\`, \`downloadButton\`). Buttons linked with \`linkToRow\` or
\`linkToRows\` are automatically disabled based on selection state.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<TableBasicDemo>;

export const Basic: Story = {};

export const WithToolbar: Story = {
  render: () => ({
    template: '<rnf-table-toolbar-demo/>',
    moduleMetadata: { imports: [TableToolbarDemo] },
  }),
};

export const WithFilterControls: Story = {
  name: 'Column Filter Controls',
  render: () => ({
    template: '<rnf-table-filter-demo/>',
    moduleMetadata: { imports: [TableFilterDemo] },
  }),
  parameters: {
    docs: {
      description: {
        story: `
Set \`filterControl: true\` on the table and add \`filterControl: 'input'\` or \`filterControl: 'select'\`
to individual columns to enable per-column filtering. Toggle visibility with \`filterControlVisible\`
and \`showFilterControlSwitch\`.
        `,
      },
    },
  },
};

export const TreeTable: Story = {
  name: 'Tree Table (treegrid)',
  render: () => ({
    template: '<rnf-table-tree-demo/>',
    moduleMetadata: { imports: [TableTreeDemo] },
  }),
  parameters: {
    docs: {
      description: {
        story: `
Enable hierarchical rows with \`treeEnable: true\`. Set \`treeShowField\` to the column that shows
the expand/collapse toggle, \`parentIdField\` to the field holding the parent row's ID, and
\`rootParentId\` to the sentinel value used for root nodes.
        `,
      },
    },
  },
};
