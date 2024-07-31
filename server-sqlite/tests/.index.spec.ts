// This file only works when run with mocha cli.
// You should run "npm run test" to unit test the backend.

import { validate, ValidationError } from 'class-validator';
import { Database } from '../server_build/db/db.js';
import { expect } from 'chai';
import { main } from '../server_build/entry.js';
import { EnvManager } from '../server_build/env.js';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import authTest from './auth.spec.js';
import containersTest from './container.spec.js';
import currenciesTest from './currencies.spec.js';
import request from 'superagent';
import Response from 'superagent/lib/node/response.js';

export type HTTPMethod = "GET" | "PATCH" | "POST" | "DELETE";

export type HTTPTestShortcutConfig = 
{
    expectedStatusCode?: number,
    serverURL: string,
    endpoint: string,
    contentType?: string | undefined,
    body?: Object | undefined,
    method: HTTPMethod,
    query?: Record<string, any> | string | undefined,
    headers? : Record<string, any> | undefined,
    responseValidator?: (response: Response) => Promise<void>
};


export class ChaiValidationError extends Error
{
    public constructor(validationError: ValidationError)
    {
        super();
        this.message = `Validation failed: ${JSON.stringify(validationError)}`;
        this.name = "ChaiValidationError";
    }
}

export class HTTPTestsBuilderUtils
{
    public static defaultContentType = 'application/json';

    public static methodNameToMethodFunc(method: HTTPMethod, executor: ChaiHttp.Agent)
    {
        if (method === 'DELETE') return executor.delete;
        if (method === 'GET') return executor.get;
        if (method === 'PATCH') return executor.patch;
        if (method === 'POST') return executor.post;
        throw new Error(`Unknown method ${method}!`);
    }

    public static setRequestHeaders(headers: Record<string, any> | undefined, request: request.Request)
    {
        for (let keyValuePair of Object.entries(headers ?? {}))
            request = request.set(keyValuePair[0], keyValuePair[1]);
        return request;
    }

    public static hydrateTestNameWithMethod(originalTestName: string, method: HTTPMethod)
    {
        let output = originalTestName;
        output = output.replace('{{method}}', method.toLowerCase());   
        output = output.replace('{{method_cap}}', method.toUpperCase());   
        return output;
    }
}

/** 
 * Contain functions to quickly build unit tests' test cases.
 * Should be used alongside Chai and Mocha.
 */
export class HTTPTestsBuilder
{
    public static async runRestExecution(config: HTTPTestShortcutConfig, chai: Chai.ChaiStatic)
    {
        return new Promise<void>(function (resolve, reject)
        {
            const executor = chai.request.execute(config.serverURL);
            let chain = HTTPTestsBuilderUtils.methodNameToMethodFunc(config.method, executor)(config.endpoint);
            chain = chain.set('Content-Type', config.contentType ?? HTTPTestsBuilderUtils.defaultContentType);
            chain = HTTPTestsBuilderUtils.setRequestHeaders(config.headers, chain);
            if (config.query) chain = chain.query(config.query);
            chain = chain.send(config.body);
            chain.end(async function (err, res) 
            { 
                if (err) return reject(err);
                try
                {
                    if (config.expectedStatusCode)
                        expect(res).to.have.status(config.expectedStatusCode);

                    if (config.responseValidator) 
                        await config.responseValidator(res);

                    resolve();
                }
                catch(e) { reject(e); }
            });
        });
    }
}

export async function validateBodyAgainstModel<T extends object>(modelClass: ClassConstructor<T>, bodyObject: object)
{
    const transformedObject = plainToInstance(modelClass, bodyObject);
    const validationErrors = await validate(transformedObject);
    return { errors: validationErrors.map(x => new ChaiValidationError(x)), transformedObject: transformedObject };
} 

export class UnitTestEndpoints
{
    public static userEndpoints = { "post": "/api/v1/users", };
    public static loginEndpoints = { "post": `/api/v1/auth/login` };
    public static containersEndpoints = 
    {
        "post": `/api/v1/container`,
        "get": `/api/v1/container`
    };
    public static currenciesEndpoints = 
    {
        "post": `/api/v1/currencies`,
        "get": `/api/v1/currencies`
    };
    public static transactionTypesEndpoints = 
    {
        "post": `/api/v1/transactionTypes`,
        "get": `/api/v1/transactionTypes`,
    };
}

await (async () => 
{
    await main(".test.env");

    const serverPort = EnvManager.serverPort;
    const resetDatabase = async () => 
    {
        await Database.AppDataSource.destroy();
        await Database.init();
    };

    const testSuitParameters = { serverPort, resetDatabase, validateBodyAgainstModel };
    authTest(testSuitParameters);
    containersTest(testSuitParameters);
    currenciesTest(testSuitParameters);

})();