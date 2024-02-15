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

const chaiHttp = require('chai-http');
/** @type { Chai.ChaiStatic } */
let chai = require("fix-esm").require('chai');
chai = chai.use(chaiHttp);

(() => 
{
    describe('Frontend Access', ()=>
    {
        it('Index.html Access', done => 
        {
            chai
            .request('http://localhost:8081')
            .get('/')
            .end(function(err, res) 
            { 
                chai.expect(res).to.have.status(200); 
                done();
            });
        })
    });
})();

(() => 
{
    const testData = require('./testData.json');
    const accessToken = require('../server_build/finance/accessToken');

    describe('Database Access', ()=>
    {
        let runTests = () => 
        {
            beforeEach(async () => { await mongoUnit.load(testData) })
            
            afterEach(() => mongoUnit.drop())

            it('Find AccessToken count: 1', () => 
            {
                return accessToken.AccessTokenClassModel.find({})
                .then(tokens => { chai.expect(tokens.length).to.equal(1) })
            })
        };

        try { runTests() } catch(e) { console.log(e); };
    });
})();

(() => 
{
    describe('API: Accounts & Sessions', ()=>
    {
        it('Register with missing username in json', done => 
        {
            chai.request('http://localhost:8081')
            .post('/api/v1/finance/accounts/register')
            .set('content-type', 'application/json')
            .send({ password: "this is my new password" })
            .end(function(error, response, body) 
            { 
                chai.expect(response).status(400); 
                done(error);   
            });
        });

        it('Register with missing password in json', done => 
        {
            chai.request('http://localhost:8081')
            .post('/api/v1/finance/accounts/register')
            .set('content-type', 'application/json')
            .send({ username: "usernameHere" })
            .end(function(error, response, body) 
            { 
                chai.expect(response).status(400); 
                done(error);   
            });
        });

        it('Register with empty username in json', done => 
        {
            chai.request('http://localhost:8081')
            .post('/api/v1/finance/accounts/register')
            .set('content-type', 'application/json')
            .send({ username: "", password: "newpassword" })
            .end(function(error, response, body) 
            { 
                chai.expect(response).status(400); 
                done(error);   
            });
        });

        it('Register with empty passsword in json', done => 
        {
            chai.request('http://localhost:8081')
            .post('/api/v1/finance/accounts/register')
            .set('content-type', 'application/json')
            .send({ username: "usernameHere", password: "" })
            .end(function(error, response, body) 
            { 
                chai.expect(response).status(400); 
                done(error);   
            });
        });

        // Start using the testData.json
        const testData = require('./testData.json');
        after(async () => { await mongoUnit.drop(); });

        it('Register with both valid password and username', async () => 
        {
            return new Promise(async (resolve, reject) => 
            {
                await mongoUnit.load(testData);

                chai.request('http://localhost:8081').post('/api/v1/finance/accounts/register').set('content-type', 'application/json')
                .send({ username: "myNewUsername", password: "myNewPassword" })
                .end((error, response, body) =>
                { 
                    chai.expect(response).status(200); 

                    if (error) resolve(error);   
                    else resolve();
                });
            });
        });

        it("Logging to the created account with wrong username", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: "this is a wrong username", password: "myNewPassword" })
            .end((error, response) =>
            { 
                chai.expect(response).status(401); 
                chai.expect(response.body).to.not.have.property("token");

                if (error) { done(error); }
                else done();
            });
        });

        it("Logging to the created account with wrong password", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: "myNewUsername", password: "this is a wrong password" })
            .end((error, response) =>
            { 
                chai.expect(response).status(401); 
                chai.expect(response.body).to.not.have.property("token");

                if (error) { done(error); }
                else done();
            });
        });

        it("Logging to the created account without useragent", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: "myNewUsername", password: "myNewPassword" })
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 
                chai.expect(response.body).to.have.property("token");

                if (error) { done(error); }
                else done();
            });
        });
    });
})();

(() => 
{
    describe('API: Transactions & Containers & Txn Types', ()=>
    {
        // Start using the testData.json
        const testData = require('./testData.json');
        const username = "myNewUsername";
        const password = "myNewPassword";

        after(async () => { await mongoUnit.drop(); });

        it('Register with both valid password and username', async () => 
        {
            return new Promise(async (resolve, reject) => 
            {
                await mongoUnit.load(testData);

                chai.request('http://localhost:8081').post('/api/v1/finance/accounts/register').set('content-type', 'application/json')
                .send({ username: username, password: password })
                .end((error, response, body) =>
                { 
                    chai.expect(response).status(200); 

                    if (error) resolve(error);   
                    else resolve();
                });
            });
        });

        let bearerToken = "";
        it("Logging to the created account without useragent", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: username, password: password })
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 
                chai.expect(response.body).to.have.property("token");
                bearerToken = response.body.token;

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 container without token", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/containers/add').set('content-type', 'application/json')
            .send({name: "myNewContainer"})
            .end((error, response) =>
            { 
                chai.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 container without name", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/containers/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({})
            .end((error, response) =>
            { 
                chai.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        /** @type {string | undefined} */
        let container1PubID = undefined;
        it("Adding 1 container with a valid name", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/containers/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({name: "myNewContainer"})
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 
                chai.expect(response).status(200); 
                chai.expect(response.body).to.have.property("name").that.is.a("string");
                chai.expect(response.body).to.have.property("pubID").that.is.a("string");
                container1PubID = response.body.pubID;

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added containers without tokens", done => 
        {
            chai.request('http://localhost:8081').get('/api/v1/finance/containers')
            .end((error, response) =>
            { 
                chai.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added containers with tokens", done => 
        {
            chai.request('http://localhost:8081').get('/api/v1/finance/containers')
            .set("Authorization", bearerToken)
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 
                chai.expect(response.body).length(1);

                response.body.forEach(item => 
                {
                    chai.expect(item).to.be.an('object');
                    chai.expect(item).to.have.property('balance');
                    chai.expect(item).to.have.property('balanceActual');
                    chai.expect(item).to.have.property('value');
                    chai.expect(item).to.have.property('valueActual');
                    chai.expect(item).to.have.property('pubID');
                    chai.expect(item).to.have.property('name');
                    chai.expect(item).to.have.property('ownersID');

                    chai.expect(item).property('balance').eql({});
                    chai.expect(item).property('balanceActual').eql({});
                    chai.expect(item).property('value').eql(0);
                    chai.expect(item).property('valueActual').eql(0);
                    chai.expect(item).property('name').eql("myNewContainer");
                });

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 transaction type without token", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/types/add').set('content-type', 'application/json')
            .send({name: "Food Txn Type"})
            .end((error, response) =>
            { 
                chai.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 transaction type without name", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/types/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({})
            .end((error, response) =>
            { 
                chai.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        let foodTypePubID = undefined;
        it("Adding 1 valid transaction type", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/types/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({name: "my food type"})
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 

                chai.expect(response.body).to.have.property("name").that.is.a('string').eql("my food type");
                chai.expect(response.body).to.have.property("pubID").that.is.a('string');
                chai.expect(response.body).to.have.property("isEarning").that.is.a('boolean').eql(true);
                chai.expect(response.body).to.have.property("isExpense").that.is.a('boolean').eql(true);
                foodTypePubID = response.body.pubID;

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added txn type without token", done => 
        {
            chai.request('http://localhost:8081').get('/api/v1/finance/transactionTypes').set('content-type', 'application/json')
            .end((error, response) =>
            { 
                chai.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added txn type with token", done => 
        {
            chai.request('http://localhost:8081').get('/api/v1/finance/transactionTypes').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 
                chai.expect(response.body).length(1);

                response.body.forEach(item => 
                {
                    chai.expect(item).to.be.an('object');
                    chai.expect(item).to.have.property("name").that.is.a('string').eql("my food type");
                    chai.expect(item).to.have.property("pubID").that.is.a('string');
                    chai.expect(item).to.have.property("isEarning").that.is.a('boolean').eql(true);
                    chai.expect(item).to.have.property("isExpense").that.is.a('boolean').eql(true);
                });

                if (error) { done(error); }
                else done();
            });
        });

        /** @type {string | undefined} */
        let container2PubID = undefined;
        it("Adding another container with a valid name", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/containers/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({name: "myNewContainer 2"})
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 
                chai.expect(response.body).to.have.property("name").that.is.a("string");
                chai.expect(response.body).to.have.property("pubID").that.is.a("string");
                container2PubID = response.body.pubID;

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 earning txn: missing tokens", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/transactions').set('content-type', 'application/json')
            .send({})
            .end((error, response) =>
            { 
                chai.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 earning txn: missing type", done => 
        {
            chai.request('http://localhost:8081').post('/api/v1/finance/transactions').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send(
            {
                from: 
                {
                    containerID: container1PubID,
                    amount: 
                    {
                        currencyID: "684fda75-46f3-b4c9-fb38-817065c44f3a",
                        value: 101.0001
                    }
                },
                date: new Date().toISOString(),
                title: "Txn1"
            })
            .end((error, response) =>
            { 
                chai.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 earning txn: missing date", done => 
        {
            post('/api/v1/finance/transactions', 
            {
                typeID: foodTypePubID,
                from: 
                {
                    containerID: container1PubID,
                    amount: 
                    {
                        currencyID: "684fda75-46f3-b4c9-fb38-817065c44f3a",
                        value: 101.0001
                    }
                },
                title: "Txn1"

            }, bearerToken)
            .end((error, response) =>
            { 
                chai.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 earning txn: missing containerID", done => 
        {
            post('/api/v1/finance/transactions', 
            {
                typeID: foodTypePubID,
                from: 
                {
                    amount: 
                    {
                        currencyID: "684fda75-46f3-b4c9-fb38-817065c44f3a",
                        value: 101.0001
                    }
                },
                date: new Date().toISOString(),
                title: "Txn1"

            }, bearerToken)
            .end((error, response) =>
            { 
                chai.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 earning txn: missing currencyID", done => 
        {
            post('/api/v1/finance/transactions', 
            {
                typeID: foodTypePubID,
                from: 
                {
                    containerID: container1PubID,
                    amount: 
                    {
                        value: 101.0001
                    }
                },
                date: new Date().toISOString(),
                title: "Txn1"

            }, bearerToken)
            .end((error, response) =>
            { 
                chai.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 earning txn: missing value", done => 
        {
            post('/api/v1/finance/transactions', 
            {
                typeID: foodTypePubID,
                from: 
                {
                    containerID: container1PubID,
                    amount: 
                    {
                        currencyID: "684fda75-46f3-b4c9-fb38-817065c44f3a",
                    }
                },
                date: new Date().toISOString(),
                title: "Txn1"

            }, bearerToken)
            .end((error, response) =>
            { 
                chai.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 valid earning txn", done => 
        {
            post('/api/v1/finance/transactions', 
            {
                typeID: foodTypePubID,
                from: 
                {
                    containerID: container1PubID,
                    amount: 
                    {
                        currencyID: "684fda75-46f3-b4c9-fb38-817065c44f3a",
                        value: 101.0001
                    }
                },
                date: new Date().toISOString(),
                title: "Txn1"
            }, bearerToken)
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added txns", done => 
        {
            chai.request('http://localhost:8081').get('/api/v1/finance/transactions').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .end((error, response) =>
            { 
                chai.expect(response).status(200); 

                if (error) { done(error); }
                else done();
            });
        });

    });
})();

after(done => 
{
    colors.logBlue(`Test Results:`, false);
    done();
})

/**
 * Shortcut for Chai post
 * @param {*} url 
 * @param {*} body 
 * @param {string?} authToken 
 * @returns 
 */
function post(url, body, authToken)
{
    let chain = chai.request('http://localhost:8081')
    .post(url)
    .set('content-type', 'application/json');
    if (authToken) chain = chain.set("Authorization", authToken);
    return chain.send(body);
}