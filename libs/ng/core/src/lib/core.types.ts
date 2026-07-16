// external imports

// internal imports

// defintions
/** Base Type - allows for generic arguments without typing conflicts  **/
export type GenericType<$T = unknown> = Record<string, $T>;

/* eslint-disable @typescript-eslint/no-explicit-any */
/** A concrete constructor type — the class can be instantiated with `new`. */
export type Constructor<T = object> = new (...args: any[]) => T;
/** An abstract constructor type — used for mixin base constraints. */
export type AbstractConstructor<T = object> = abstract new (
  ...args: any[]
) => T;

/** Base Type for Enums - provides the code and the name properties **/
export interface EnumType<T> extends GenericType {
  code: T;
  name: string;
}

/** Class to manage lits of Enums of a Type **/
export abstract class EnumTypeSet<T extends string> {
  protected abstract get enumTypes(): Record<T, EnumType<T>>;

  getType(type: T): EnumType<T> {
    return this.enumTypes[type];
  }

  get typeList(): EnumType<T>[] {
    return Object.values(this.enumTypes);
  }
}

/** Type for providing context to ng-container templates **/
export interface TemplateContext {
  $implicit: GenericType;
}
