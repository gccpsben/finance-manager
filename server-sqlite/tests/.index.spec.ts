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
import request from 'superagent';
import { CBHandler } from 'superagent/types.js';
import Response from 'superagent/lib/node/response.js';

export type HTTPMethod = "GET" | "PATCH" | "POST" | "DELETE";

export type HTTPTestShortcutConfig = 
{
    serverURL: string,
    endpoint: string,
    contentType?: string | undefined,
    body?: Object | undefined,
    testName: string,
    method: HTTPMethod,
    query?: Record<string, any> | string | undefined,
    headers? : Record<string, any> | undefined,
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

type AddParameters< TFunction extends (...args: any) => any, TParameters extends [...args: any]> =  
    (...args: [...Parameters<TFunction>, ...TParameters] ) => ReturnType<TFunction>;

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

    public static buildHTTPTest(config: HTTPTestShortcutConfig, testFunc: AddParameters<CBHandler, [doneFunc: Mocha.Done]>, chai: Chai.ChaiStatic)
    {
        return function(done: Mocha.Done)
        {
            const executor = chai.request.execute(config.serverURL);
            const contentType = config.contentType ?? HTTPTestsBuilderUtils.defaultContentType;
            const body = config.body ?? {};

            let chain = HTTPTestsBuilderUtils.methodNameToMethodFunc(config.method, executor)(config.endpoint);
            chain = chain.set('Content-Type', contentType);
            chain = HTTPTestsBuilderUtils.setRequestHeaders(config.headers, chain);
            if (config.query) chain = chain.query(config.query);
            chain = chain.send(body);

            chain.end(function (err, res) { testFunc(err, res, done); });
        }
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
    public static expectStatus(config: HTTPTestShortcutConfig & 
    {
        statusCode: number,
        validator? : (res: Response, done: Mocha.Done) => Promise<void> | undefined
    }, testFunc: Mocha.TestFunction, chai: Chai.ChaiStatic)
    {
        const validator = config.validator ?? function (res: Response, done: Mocha.Done) { done(); };

        testFunc(config.testName, function(done)
        {
            HTTPTestsBuilderUtils.buildHTTPTest(config, function (err, res, done)
            {
                expect(res).to.have.status(config.statusCode);
                validator(res, done);
            }, chai)(done);
        });
    }

    public static expectStatusMultipleMethods
    (
        config: Omit<HTTPTestShortcutConfig, 'method'> & 
        {
            methods: HTTPMethod[],
            statusCode: number
        },
        testFunc: Mocha.TestFunction, 
        chai: Chai.ChaiStatic
    )
    {
        for (const method of config.methods)
        {
            const newTestName = `${HTTPTestsBuilderUtils.hydrateTestNameWithMethod(config.testName, method)}`;
            HTTPTestsBuilder.expectStatus(
            {
                ...config,
                testName: newTestName,
                method: method,
                statusCode: config.statusCode
            }, testFunc, chai);
        }
    }
}

export async function validateBodyAgainstModel<T extends object>(modelClass: ClassConstructor<T>, bodyObject: object)
{
    const transformedObject = plainToInstance(modelClass, bodyObject);
    const validationErrors = await validate(transformedObject);
    return { errors: validationErrors.map(x => new ChaiValidationError(x)), transformedObject: transformedObject };
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
})();