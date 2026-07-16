import { ReadModel, WriteModel } from '@rn-forge/ng/http/crud';

export interface ProductWrite extends WriteModel {
  id?: number | null;
  name: string;
  category: string;
  price: number;
  active: boolean;
}

export interface ProductRead extends ReadModel {
  readonly id: number;
  readonly name: string;
  readonly category: string;
  readonly price: number;
  readonly active: boolean;
}
