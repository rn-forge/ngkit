export interface ScaffoldComponentGeneratorSchema {
  project: string;
  name: string;
  directory?: string;
  type?: 'component' | 'page' | 'table' | 'form';
  export?: boolean;
  withStory?: boolean;
  withTest?: boolean;
}
