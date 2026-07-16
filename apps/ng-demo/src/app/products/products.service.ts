import { Injectable } from '@angular/core';
import { BackendService } from '@rn-forge/ng/http/crud';
import { ProductRead, ProductWrite } from './products.types';

@Injectable({ providedIn: 'root' })
export class ProductsService extends BackendService<ProductWrite, ProductRead> {
  constructor() {
    super('products');
  }
}
