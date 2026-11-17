import {
  addDependenciesToPackageJson,
  GeneratorCallback,
  Tree,
} from '@nx/devkit';
import { BOOTSTRAP_TABLE_PACKAGES, PEER_DEPENDENCIES } from './versions';

/** Peer dependencies that are not Bootstrap Table packages. */
export function nonTablePeers(): Record<string, string> {
  const table: readonly string[] = BOOTSTRAP_TABLE_PACKAGES;
  return Object.fromEntries(
    Object.entries(PEER_DEPENDENCIES).filter(([name]) => !table.includes(name)),
  );
}

/** Adds the three Bootstrap Table dependencies, keeping any version already present. */
export function addBootstrapTableDependencies(tree: Tree): GeneratorCallback {
  const dependencies = Object.fromEntries(
    BOOTSTRAP_TABLE_PACKAGES.map((name) => [name, PEER_DEPENDENCIES[name]]),
  );
  return addDependenciesToPackageJson(tree, dependencies, {}, undefined, true);
}
