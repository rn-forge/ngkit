import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { AbstractCRUDManager } from '@rn-forge/ng-bootstrap/crud';
import { ColumnOptions } from '@rn-forge/ng-bootstrap';
import { GenericType } from '@rn-forge/ng/core';
import { BackendService } from '@rn-forge/ng/http/crud';
import { ProductsService } from './products.service';
import { ProductRead, ProductWrite } from './products.types';

const CATEGORIES = ['Widgets', 'Gadgets', 'Other'];
const ACTIVE_OPTIONS = [
  { code: 'true', name: 'Yes' },
  { code: 'false', name: 'No' },
];

@Injectable()
export class ProductsManager extends AbstractCRUDManager<
  ProductWrite,
  ProductRead
> {
  override readonly name = 'Product';
  override permissionKey = 'demo.products';

  private readonly productsService = new ProductsService();

  readonly categories = CATEGORIES;
  readonly activeOptions = ACTIVE_OPTIONS;

  override get domainService(): BackendService<ProductWrite, ProductRead> {
    return this.productsService;
  }

  override tableColumns(): ColumnOptions[] {
    return [
      { field: 'state', title: 'State', checkbox: true },
      { field: 'id', title: 'ID', sortable: true },
      { field: 'name', title: 'Name', sortable: true, filterControl: 'input' },
      {
        field: 'category',
        title: 'Category',
        sortable: true,
        filterControl: 'select',
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
