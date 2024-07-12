const initBase = require('./init.spec');
const mongoUnit = require('mongo-unit');

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

                initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/accounts/register').set('content-type', 'application/json')
                .send({ username: username, password: password })
                .end((error, response, body) =>
                { 
                    initBase.expect(response).status(200); 

                    if (error) resolve(error);   
                    else resolve();
                });
            });
        });

        let bearerToken = "";
        it("Logging to the created account without useragent", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: username, password: password })
            .end((error, response) =>
            { 
                initBase.expect(response).status(200); 
                initBase.expect(response.body).to.have.property("token");
                bearerToken = response.body.token;

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 container without token", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/containers/add').set('content-type', 'application/json')
            .send({name: "myNewContainer"})
            .end((error, response) =>
            { 
                initBase.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 container without name", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/containers/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({})
            .end((error, response) =>
            { 
                initBase.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        /** @type {string | undefined} */
        let container1PubID = undefined;
        it("Adding 1 container with a valid name", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/containers/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({name: "myNewContainer"})
            .end((error, response) =>
            { 
                initBase.expect(response).status(200); 
                initBase.expect(response).status(200); 
                initBase.expect(response.body).to.have.property("name").that.is.a("string");
                initBase.expect(response.body).to.have.property("pubID").that.is.a("string");
                container1PubID = response.body.pubID;

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added containers without tokens", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).get('/api/v1/finance/containers')
            .end((error, response) =>
            { 
                initBase.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added containers with tokens", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).get('/api/v1/finance/containers')
            .set("Authorization", bearerToken)
            .end((error, response) =>
            { 
                initBase.expect(response).status(200); 
                initBase.expect(response.body).length(1);

                response.body.forEach(item => 
                {
                    initBase.expect(item).to.be.an('object');
                    initBase.expect(item).to.have.property('balance');
                    initBase.expect(item).to.have.property('balanceActual');
                    initBase.expect(item).to.have.property('value');
                    initBase.expect(item).to.have.property('valueActual');
                    initBase.expect(item).to.have.property('pubID');
                    initBase.expect(item).to.have.property('name');
                    initBase.expect(item).to.have.property('ownersID');

                    initBase.expect(item).property('balance').eql({});
                    initBase.expect(item).property('balanceActual').eql({});
                    initBase.expect(item).property('value').eql(0);
                    initBase.expect(item).property('valueActual').eql(0);
                    initBase.expect(item).property('name').eql("myNewContainer");
                });

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 transaction type without token", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/types/add').set('content-type', 'application/json')
            .send({name: "Food Txn Type"})
            .end((error, response) =>
            { 
                initBase.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 transaction type without name", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/types/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({})
            .end((error, response) =>
            { 
                initBase.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        let foodTypePubID = undefined;
        it("Adding 1 valid transaction type", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/types/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({name: "my food type"})
            .end((error, response) =>
            { 
                initBase.expect(response).status(200); 

                initBase.expect(response.body).to.have.property("name").that.is.a('string').eql("my food type");
                initBase.expect(response.body).to.have.property("pubID").that.is.a('string');
                initBase.expect(response.body).to.have.property("isEarning").that.is.a('boolean').eql(true);
                initBase.expect(response.body).to.have.property("isExpense").that.is.a('boolean').eql(true);
                foodTypePubID = response.body.pubID;

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added txn type without token", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).get('/api/v1/finance/transactionTypes').set('content-type', 'application/json')
            .end((error, response) =>
            { 
                initBase.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added txn type with token", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).get('/api/v1/finance/transactionTypes').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .end((error, response) =>
            { 
                initBase.expect(response).status(200); 
                initBase.expect(response.body).length(1);

                response.body.forEach(item => 
                {
                    initBase.expect(item).to.be.an('object');
                    initBase.expect(item).to.have.property("name").that.is.a('string').eql("my food type");
                    initBase.expect(item).to.have.property("pubID").that.is.a('string');
                    initBase.expect(item).to.have.property("isEarning").that.is.a('boolean').eql(true);
                    initBase.expect(item).to.have.property("isExpense").that.is.a('boolean').eql(true);
                });

                if (error) { done(error); }
                else done();
            });
        });

        /** @type {string | undefined} */
        let container2PubID = undefined;
        it("Adding another container with a valid name", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/containers/add').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .send({name: "myNewContainer 2"})
            .end((error, response) =>
            { 
                initBase.expect(response).status(200); 
                initBase.expect(response.body).to.have.property("name").that.is.a("string");
                initBase.expect(response.body).to.have.property("pubID").that.is.a("string");
                container2PubID = response.body.pubID;

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 expenses txn: missing tokens", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/transactions').set('content-type', 'application/json')
            .send({})
            .end((error, response) =>
            { 
                initBase.expect(response).status(401); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 expenses txn: missing type", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/transactions').set('content-type', 'application/json')
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
                initBase.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 expenses txn: missing date", done => 
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
                initBase.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 expenses txn: missing containerID", done => 
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
                initBase.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 expenses txn: missing currencyID", done => 
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
                initBase.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        it("Adding 1 expenses txn: missing value", done => 
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
                initBase.expect(response).status(400); 

                if (error) { done(error); }
                else done();
            });
        });

        let txn1PubID = undefined;
        it("Adding 1 valid expenses txn", done => 
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
                initBase.expect(response).status(200); 

                initBase.expect(response.body).to.have.property("pubID");
                initBase.expect(response.body).to.have.property("title").eql("Txn1");
                initBase.expect(response.body).to.have.property("isTypePending").eql(false);
                initBase.expect(response.body).to.have.property("isTypePending").eql(false);

                txn1PubID = response.body.pubID;

                if (error) { done(error); }
                else done();
            });
        });

        it("Retriving added txns", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).get('/api/v1/finance/transactions').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .end((error, response) =>
            {                
                initBase.expect(response).status(200); 
                initBase.expect(response.body['rangeItems']).length(1);
                initBase.expect(response.body['rangeItems'][0]).to.have.property("pubID");
                initBase.expect(response.body['rangeItems'][0]).to.have.property("changeInValue").eql(-101.0001);

                if (error) { done(error); }
                else done();
            });
        });
    });

    describe('API: Data Correctness - Suit 1', () => 
    {
        let bearerToken = "";
        // Start using the testData.json
        const testData = require('./dataCorrectnessData1.json');
        const username = "myNewUsername_____2";
        const password = "myNewPassword_____2";

        after(async () => { await mongoUnit.drop(); });

        it('Register with both valid password and username', async () => 
        {
            return new Promise(async (resolve, reject) => 
            {
                await mongoUnit.load(testData);

                initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/accounts/register').set('content-type', 'application/json')
                .send({ username: username, password: password })
                .end((error, response, body) =>
                { 
                    initBase.expect(response).status(200); 

                    if (error) resolve(error);   
                    else resolve();
                });
            });
        });

        it("Logging to the created account without useragent", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: username, password: password })
            .end((error, response) =>
            { 
                initBase.expect(response).status(200); 
                initBase.expect(response.body).to.have.property("token");
                bearerToken = response.body.token;

                if (error) { done(error); }
                else done();
            });
        });

        it("Checking Dashboard Summary", done => 
        {
            initBase.request(`http://localhost:${process.env.PORT}`).get('/api/v1/finance/summary').set('content-type', 'application/json')
            .set("Authorization", bearerToken)
            .end((error, response) =>
            {                
                initBase.expect(response).status(200); 
                initBase.expect(response.body['totalIncomes30d']).equals(0);
                initBase.expect(response.body['totalExpenses30d']).equals(101.0001);
                initBase.expect(response.body['totalIncomes7d']).equals(0);
                initBase.expect(response.body['totalExpenses7d']).equals(101.0001);
                initBase.expect(response.body['totalIncomes']).equals(0);
                initBase.expect(response.body['totalExpenses']).equals(101.0001);
                initBase.expect(response.body['expenses30d']).length(1);

                if (error) { done(error); }
                else done();
            });
        });
    });

})();

/**
 * Shortcut for initBase post
 * @param {*} url 
 * @param {*} body 
 * @param {string?} authToken 
 * @returns 
 */
function post(url, body, authToken)
{
    let initBasen = initBase.request(`http://localhost:${process.env.PORT}`)
    .post(url)
    .set('content-type', 'application/json');
    if (authToken) initBasen = initBasen.set("Authorization", authToken);
    return initBasen.send(body);
}