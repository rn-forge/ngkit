export interface SetupGeneratorSchema {
  project: string;
  packageManager?: 'pnpm' | 'npm' | 'yarn';
  skipInstall?: boolean;
  skipStyles?: boolean;
  skipConfig?: boolean;
  includeBootstrapTable?: boolean;
  includeTheme?: boolean;
}
