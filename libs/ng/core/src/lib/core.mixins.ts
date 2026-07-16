// external imports

// internal imports
import { AbstractConstructor, Constructor } from './core.types';

// defintions

/**
 * A mixin factory type: a function that takes a concrete base class and returns
 * an extended class. Use with {@link applyMixin} to compose behaviour.
 */
export type Mixin<TBase extends Constructor, TResult extends Constructor> = (
  base: TBase,
) => TResult;

/**
 * Like {@link Mixin} but for abstract base classes. Use with {@link applyAbstractMixin}.
 */
export type AbstractMixin<
  TBase extends AbstractConstructor,
  TResult extends AbstractConstructor,
> = (base: TBase) => TResult;

/**
 * Applies a {@link Mixin} to a concrete base class.
 *
 * @example
 * ```ts
 * const MyMixin = (Base: Constructor) => class extends Base { greet() { return 'hi'; } };
 * const Mixed = applyMixin(BaseClass, MyMixin);
 * ```
 */
export function applyMixin<
  TBase extends Constructor,
  TResult extends Constructor,
>(base: TBase, mixin: Mixin<TBase, TResult>): TResult {
  return mixin(base);
}

/**
 * Applies an {@link AbstractMixin} to an abstract base class.
 * Useful when the base class itself is abstract (e.g. `BaseComponent`).
 */
export function applyAbstractMixin<
  TBase extends AbstractConstructor,
  TResult extends AbstractConstructor,
>(base: TBase, mixin: AbstractMixin<TBase, TResult>): TResult {
  return mixin(base);
}
