import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { validateBodyAgainstModel } from './.index.spec.js';
const chai = use(chaiHttp);

const POST_USER_ENDPOINT = `/api/v1/users`;
const POST_LOGIN_ENDPOINT = `/api/v1/auth/login`;

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;

    const serverURL = `http://localhost:${serverPort}`;

    before(async function () { await resetDatabase(); });

    describe("Access Tokens and Users" , () => 
    {
        it("Create User without body", function(done) 
        {
            chai.request.execute(serverURL)
            .post(POST_USER_ENDPOINT)
            .end((err, res) => 
            {
                expect(res).to.have.status(400);
                done();
            });
        });

        it("Create User without username", function(done) 
        {
            chai.request.execute(serverURL)
            .post(POST_USER_ENDPOINT)
            .set('Content-Type', 'application/json')
            .send({ password: '123' })
            .end((err, res) => 
            {
                expect(res).to.have.status(400);
                done();
            });
        });

        it("Create User without password", function(done) 
        {
            chai.request.execute(serverURL)
            .post(POST_USER_ENDPOINT)
            .set('Content-Type', 'application/json')
            .send({ username: 'Username here' })
            .end((err, res) => 
            {
                expect(res).to.have.status(400);
                done();
            });
        });

        const correctUsername = "User 1";
        const correctPassword = "password123";

        it("Create User with valid body", function(done) 
        {
            class expectedBodyType
            {
                // @ts-ignore
                @IsString() userid: string;
            }

            chai.request.execute(serverURL)
            .post(POST_USER_ENDPOINT)
            .set('Content-Type', 'application/json')
            .send({ username: correctUsername, password: correctPassword })
            .end(async (err, res) => 
            {
                expect(res).to.have.status(200);
                const validationResult = await validateBodyAgainstModel(expectedBodyType, res.body);
                done(validationResult.errors[0]);
            });
        });

        it("Login without password", function(done) 
        {
            chai.request.execute(serverURL)
            .post(POST_LOGIN_ENDPOINT)
            .set('Content-Type', 'application/json')
            .send({ username: correctUsername })
            .end((err, res) => 
            {
                expect(res).to.have.status(400);
                done();
            });
        });

        it("Login without username", function(done) 
        {
            chai.request.execute(serverURL)
            .post(POST_LOGIN_ENDPOINT)
            .set('Content-Type', 'application/json')
            .send({ password: correctPassword })
            .end((err, res) => 
            {
                expect(res).to.have.status(400);
                done();
            });
        });

        it("Login with incorrect username", function(done) 
        {
            chai.request.execute(serverURL)
            .post(POST_LOGIN_ENDPOINT)
            .set('Content-Type', 'application/json')
            .send({ username: correctUsername + "123", password: correctPassword })
            .end((err, res) => 
            {
                expect(res).to.have.status(401);
                done();
            });
        });
        
        it("Login with incorrect password", function(done) 
        {
            chai.request.execute(serverURL)
            .post(POST_LOGIN_ENDPOINT)
            .set('Content-Type', 'application/json')
            .send({ username: correctUsername, password: correctPassword + '1231s' })
            .end((err, res) => 
            {
                expect(res).to.have.status(401);
                done();
            });
        });

        let loginToken = undefined as undefined | string;

        it("Login with correct username and password", function(done) 
        {
            class expectedBodyType
            {
                // @ts-ignore
                @IsString() token: string;

                // @ts-ignore
                @IsString() owner: string;

                // @ts-ignore
                @IsDateString() creationDate: string;

                // @ts-ignore
                @IsDateString() expiryDate: string;
            }

            chai.request.execute(serverURL)
            .post(POST_LOGIN_ENDPOINT)
            .set('Content-Type', 'application/json')
            .send({ username: correctUsername, password: correctPassword })
            .end(async (err, res) => 
            {
                expect(res).to.have.status(200);
                const validationResult = await validateBodyAgainstModel(expectedBodyType, res.body);
                loginToken = validationResult.transformedObject.token;
                done(validationResult.errors[0]);
            });           
        });
    });    
}