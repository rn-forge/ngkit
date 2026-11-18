export interface ConfigureTestingGeneratorSchema {
  project: string;
  coverageThreshold?: number;
  reporters?: string;
  skipInstall?: boolean;
}
