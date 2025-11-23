import common from './common.json';
import auth from './auth.json';
import dashboard from './dashboard.json';
import settings from './settings.json';
import management from './management.json';
import playground from './playground.json';
import models from './models.json';
import billing from './billing.json';
import logs from './logs.json';

const translations = {
  ...common,
  ...auth,
  ...dashboard,
  ...settings,
  ...management,
  ...playground,
  ...models,
  ...billing,
  ...logs,
};

export default translations;
