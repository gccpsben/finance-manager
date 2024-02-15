const initBase = require('./init.spec');
const mongoUnit = require('mongo-unit');

(() => 
{
    describe('API: Accounts & Sessions', ()=>
    {
        it('Register with missing username in json', done => 
        {
            initBase.request('http://localhost:8081')
            .post('/api/v1/finance/accounts/register')
            .set('content-type', 'application/json')
            .send({ password: "this is my new password" })
            .end(function(error, response, body) 
            { 
                initBase.expect(response).status(400); 
                done(error);   
            });
        });

        it('Register with missing password in json', done => 
        {
            initBase.request('http://localhost:8081')
            .post('/api/v1/finance/accounts/register')
            .set('content-type', 'application/json')
            .send({ username: "usernameHere" })
            .end(function(error, response, body) 
            { 
                initBase.expect(response).status(400); 
                done(error);   
            });
        });

        it('Register with empty username in json', done => 
        {
            initBase.request('http://localhost:8081')
            .post('/api/v1/finance/accounts/register')
            .set('content-type', 'application/json')
            .send({ username: "", password: "newpassword" })
            .end(function(error, response, body) 
            { 
                initBase.expect(response).status(400); 
                done(error);   
            });
        });

        it('Register with empty passsword in json', done => 
        {
            initBase.request('http://localhost:8081')
            .post('/api/v1/finance/accounts/register')
            .set('content-type', 'application/json')
            .send({ username: "usernameHere", password: "" })
            .end(function(error, response, body) 
            { 
                initBase.expect(response).status(400); 
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

                initBase.request('http://localhost:8081').post('/api/v1/finance/accounts/register').set('content-type', 'application/json')
                .send({ username: "myNewUsername", password: "myNewPassword" })
                .end((error, response, body) =>
                { 
                    initBase.expect(response).status(200); 

                    if (error) resolve(error);   
                    else resolve();
                });
            });
        });

        it("Logging to the created account with wrong username", done => 
        {
            initBase.request('http://localhost:8081').post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: "this is a wrong username", password: "myNewPassword" })
            .end((error, response) =>
            { 
                initBase.expect(response).status(401); 
                initBase.expect(response.body).to.not.have.property("token");

                if (error) { done(error); }
                else done();
            });
        });

        it("Logging to the created account with wrong password", done => 
        {
            initBase.request('http://localhost:8081').post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: "myNewUsername", password: "this is a wrong password" })
            .end((error, response) =>
            { 
                initBase.expect(response).status(401); 
                initBase.expect(response.body).to.not.have.property("token");

                if (error) { done(error); }
                else done();
            });
        });

        it("Logging to the created account without useragent", done => 
        {
            initBase.request('http://localhost:8081').post('/api/v1/finance/login').set('content-type', 'application/json')
            .send({ username: "myNewUsername", password: "myNewPassword" })
            .end((error, response) =>
            { 
                initBase.expect(response).status(200); 
                initBase.expect(response.body).to.have.property("token");

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
    let initBasen = initBase.request('http://localhost:8081')
    .post(url)
    .set('content-type', 'application/json');
    if (authToken) initBasen = initBasen.set("Authorization", authToken);
    return initBasen.send(body);
}