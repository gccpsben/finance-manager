import * as server from './server';

(async () => 
{
    server.loadEnv();
    await server.startServer();
})();
