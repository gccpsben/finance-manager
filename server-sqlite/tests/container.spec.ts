import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { HTTPMethod, HTTPTestsBuilder } from './.index.spec.js';
import { randomUUID } from 'crypto';
const chai = use(chaiHttp);

const GET_POST_CONTAINERS_ENDPOINT = `/api/v1/container`;

export default async function(parameters)
{
    const resetDatabase = parameters.resetDatabase;
    const serverPort = parameters.serverPort;

    const serverURL = `http://localhost:${serverPort}`;

    before(async function () { await resetDatabase(); });

    describe("Containers" , () => 
    {
        for (const method of (["GET", "POST"] as HTTPMethod[]))
        {
            it(`${method} Container without tokens`, async function () 
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 401,
                    body: {},
                    method: method,
                    endpoint: GET_POST_CONTAINERS_ENDPOINT,
                    serverURL: serverURL,
                }, chai);
            });

            it(`${method} Container with wrong tokens`, async function () 
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 401,
                    body: {},
                    method: method,
                    endpoint: GET_POST_CONTAINERS_ENDPOINT,
                    serverURL: serverURL,
                    headers: { "authorization": randomUUID() },
                }, chai);
            });
        }
    });    
}