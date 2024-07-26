// This file only works when run with mocha cli.
// You should run "npm run test" to unit test the backend.

import {main} from '../server_build/entry.js'
await main(".test.env");
await import('./scope1.test.js');
await import('./scope2.test.js');