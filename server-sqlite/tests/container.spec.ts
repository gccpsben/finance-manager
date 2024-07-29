import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { validateBodyAgainstModel } from './.index.spec.js';
const chai = use(chaiHttp);

const GET_CONTAINERS_ENDPOINT = `/api/v1/container`;
const POST_CONTAINERS_ENDPOINT = `/api/v1/container`;

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;

    const serverURL = `http://localhost:${serverPort}`;

    before(async function () { await resetDatabase(); });

    describe("Containers" , () => 
    {
        it("Get Containers without tokens", function(done) 
        {
            chai.request.execute(serverURL)
            .get(GET_CONTAINERS_ENDPOINT)
            .end((err, res) => 
            {
                expect(res).to.have.status(401);
                done();
            });
        });

        it("Create Container without tokens", function(done) 
        {
            chai.request.execute(serverURL)
            .post(POST_CONTAINERS_ENDPOINT)
            .end((err, res) => 
            {
                expect(res).to.have.status(401);
                done();
            });
        });
    });    
}