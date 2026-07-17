import { applicationConfig, type Preview } from '@storybook/angular';
import { provideRnForgeCoreConfig } from '@rn-forge/ng/core';
import { provideRnForgeBootstrapConfig } from '../src/lib/bootstrap.config';

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        provideRnForgeCoreConfig({ appName: 'ng-bootstrap' }),
        provideRnForgeBootstrapConfig({}),
      ],
    }),
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /date$/i } },
  },
};

export default preview;
