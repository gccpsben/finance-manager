//@ts-ignore

const mongoUnit = require('mongo-unit')
const colors = require("../server_build/extendedLog");
const server = require("../server_build/server");

mongoUnit.start().then(async () => 
{
    colors.logGreen('Fake mongo is started: ' + mongoUnit.getUrl(), false);
    
    server.loadEnv("./test.env");
    process.env.FINANCE_DB_FULL_URL = mongoUnit.getUrl() // this var process.env.DATABASE_URL = will keep link to fake mongo

    await server.startServer();
    server.startLogger();

    run() // this line start mocha tests
})

after(async () => 
{
    colors.logRed(`Stopping virtual database...`, false);
    colors.logBlue(`Test Results:`, false);
    server.server.close();
    return await mongoUnit.stop();
})