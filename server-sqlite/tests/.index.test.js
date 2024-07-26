// This file only works when run with mocha cli.
// You should run "npm run test" to unit test the backend.

import { main } from '../server_build/entry.js'
import { EnvManager } from '../server_build/env.js';
await main(".test.env");
const serverPort = EnvManager.serverPort;
(await import('./scope1.test.js')).default(serverPort);
(await import('./scope2.test.js')).default(serverPort);