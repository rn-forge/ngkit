export interface ConfigureThemeGeneratorSchema {
  project: string;
  theme?: 'default';
  stylesheet?: string;
  force?: boolean;
}
