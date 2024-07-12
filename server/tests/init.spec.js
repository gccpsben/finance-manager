const chaiHttp = require('chai-http');
/** @type { Chai.ChaiStatic } */
let chai = require("fix-esm").require('chai');
chai = chai.use(chaiHttp);

const mongoUnit = require('mongo-unit');
const colors = require("../server_build/extendedLog");
const server = require("../server_build/server");

mongoUnit.start().then(async () => 
{
    colors.logGreen('Fake mongo is started: ' + mongoUnit.getUrl(), false);
    
    server.loadEnv("./test.env");
    process.env.FINANCE_DB_FULL_URL = mongoUnit.getUrl() // this var process.env.DATABASE_URL = will keep link to fake mongo

    await server.startServer();

    // Run tests in this order:
    require("./database.spec");
    require("./frontend.spec");
    require("./auth.spec");
    require("./txns.spec");

    run() // this line start mocha tests
});

after(done => 
{
    colors.logBlue(`Test Results:`, false);
    done();
})

module.exports = chai;