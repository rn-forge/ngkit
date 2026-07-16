import { Component, inject } from '@angular/core';
import { CRUDComponent } from '@rn-forge/ng-bootstrap/crud';
import {
  DropdownFieldComponent,
  InputFieldComponent,
} from '@rn-forge/ng-bootstrap/form';
import { ProductsManager } from './products.manager';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [CRUDComponent, DropdownFieldComponent, InputFieldComponent],
  providers: [ProductsManager],
  templateUrl: './products.page.html',
})
export class ProductsPageComponent {
  readonly manager = inject(ProductsManager);
}
