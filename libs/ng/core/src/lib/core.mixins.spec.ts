import {
  AbstractMixin,
  applyAbstractMixin,
  applyMixin,
  Mixin,
} from './core.mixins';
import { AbstractConstructor, Constructor } from './core.types';

describe('applyMixin', () => {
  it('applies a mixin factory to a concrete base class', () => {
    class Base {
      greet(): string {
        return 'base';
      }
    }

    const withExclamation: Mixin<Constructor<Base>, Constructor<Base>> = (
      BaseClass,
    ) =>
      class extends BaseClass {
        override greet(): string {
          return `${super.greet()}!`;
        }
      };

    const Mixed = applyMixin(Base, withExclamation);
    expect(new Mixed().greet()).toBe('base!');
  });
});

describe('applyAbstractMixin', () => {
  it('applies a mixin factory to an abstract base class', () => {
    abstract class AbstractBase {
      abstract id(): number;
      describe(): string {
        return `id:${this.id()}`;
      }
    }

    const withLogging: AbstractMixin<
      AbstractConstructor<AbstractBase>,
      AbstractConstructor<AbstractBase>
    > = (BaseClass) => {
      abstract class WithLogging extends BaseClass {}
      return WithLogging;
    };

    const Mixed = applyAbstractMixin(AbstractBase, withLogging);
    class Concrete extends Mixed {
      override id(): number {
        return 42;
      }
    }

    expect(new Concrete().describe()).toBe('id:42');
  });
});
