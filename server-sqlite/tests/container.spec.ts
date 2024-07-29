import { before } from 'mocha';
import { use, expect, AssertionError } from 'chai';
import chaiHttp from 'chai-http';
import { IsDateString, IsDefined, IsNumber, IsString } from 'class-validator';
import { HTTPTestsBuilder } from './.index.spec.js';
import { randomUUID } from 'crypto';
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
        HTTPTestsBuilder.UnauthorizedTestsBuilder.expectUnauthorizedMethods({
            testName: "{{method_cap}} Container without tokens",
            methods: ["GET", "POST"],
            endpoint: GET_CONTAINERS_ENDPOINT,
            serverURL: serverURL,
            body: {}
        }, it, chai);

        HTTPTestsBuilder.UnauthorizedTestsBuilder.expectUnauthorizedMethods({
            testName: "{{method_cap}} Container with wrong tokens",
            methods: ["GET", "POST"],
            endpoint: GET_CONTAINERS_ENDPOINT,
            serverURL: serverURL,
            headers: { "authorization": randomUUID() },
            body: {}
        }, it, chai);
    });    
}