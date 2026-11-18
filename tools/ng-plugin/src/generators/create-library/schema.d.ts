export interface CreateLibraryGeneratorSchema {
  name: string;
  importPath: string;
  directory?: string;
  secondaryEntryPoints?: string;
  storybook?: boolean;
  compodoc?: boolean;
  coverageThreshold?: number;
  skipInstall?: boolean;
}
