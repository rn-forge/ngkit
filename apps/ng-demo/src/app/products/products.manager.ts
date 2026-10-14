import { Injectable, inject } from '@angular/core';
import { Validators } from '@angular/forms';
import { standardDataSource } from '@rn-forge/ng/crud';
import {
  AbstractCrudManager,
  CrudFilterField,
} from '@rn-forge/ng-bootstrap/crud';
import { ColumnOptions } from '@rn-forge/ng-bootstrap';
import { GenericType } from '@rn-forge/ng/core';
import { DEMO_API_URL } from '../shared/api.tokens';
import { ProductRead, ProductWrite } from './products.types';

const CATEGORIES = ['Widgets', 'Gadgets', 'Other'];
const ACTIVE_OPTIONS = [
  { code: 'true', name: 'Yes' },
  { code: 'false', name: 'No' },
];

@Injectable()
export class ProductsManager extends AbstractCrudManager<
  ProductWrite,
  ProductRead
> {
  override readonly name = 'Product';
  override permissionKey = 'demo.products';

  override readonly dataSource = standardDataSource<ProductWrite, ProductRead>({
    baseUrl: inject(DEMO_API_URL),
    collection: '/products',
    features: {
      batchDelete: true,
      import: true,
      importTemplate: true,
      export: ['text/csv'],
    },
  });

  readonly categories = CATEGORIES;
  readonly activeOptions = ACTIVE_OPTIONS;

  override filterFields(): readonly CrudFilterField[] {
    return [
      { name: 'name', label: 'Name' },
      {
        name: 'category',
        label: 'Category',
        options: CATEGORIES.map((c) => ({ code: c, name: c })),
      },
    ];
  }

  override tableColumns(): ColumnOptions[] {
    return [
      { field: 'state', title: 'State', checkbox: true },
      { field: 'id', title: 'ID', sortable: true },
      { field: 'name', title: 'Name', sortable: true },
      {
        field: 'category',
        title: 'Category',
        sortable: true,
      },
      {
        field: 'price',
        title: 'Price',
        sortable: true,
        formatter: (value: number) => `$${Number(value).toFixed(2)}`,
      },
      {
        field: 'active',
        title: 'Active',
        formatter: (value: boolean) => (value ? 'Yes' : 'No'),
      },
    ];
  }

  override addUpdateFormControls(): GenericType {
    return {
      id: ['', []],
      name: ['', [Validators.required]],
      category: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      active: ['true'],
    };
  }

  override toAddUpdateFormValue(data: ProductRead): ProductWrite {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      price: data.price,
      active: String(data.active) as unknown as boolean,
    };
  }

  override fromAddUpdateFormValue(): ProductWrite {
    const raw = this.addUpdateForm.rawValue as GenericType;
    return {
      id: raw['id'] as number | undefined,
      name: raw['name'] as string,
      category: raw['category'] as string,
      price: Number(raw['price']),
      active: raw['active'] === 'true',
    };
  }
}
