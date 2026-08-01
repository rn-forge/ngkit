import { loadBootstrap } from './bootstrap-loader';

vi.mock('bootstrap/dist/js/bootstrap.bundle.js', () => ({}));

describe('loadBootstrap', () => {
  it('resolves once the bootstrap bundle has been imported', async () => {
    await expect(loadBootstrap()).resolves.toBeUndefined();
  });

  it('memoizes the load so repeated calls return the same promise', () => {
    const first = loadBootstrap();
    const second = loadBootstrap();

    expect(second).toBe(first);
  });
});
