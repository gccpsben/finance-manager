// This file only works when run with mocha cli.
// You should run "npm run test" to unit test the backend.

import { validate, ValidationError } from 'class-validator';
import { Database } from '../server_build/db/db.js';
import { main } from '../server_build/entry.js';
import { EnvManager } from '../server_build/env.js';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import authTest from './auth.spec.js';
import containersTest from './container.spec.js';

export class ChaiValidationError extends Error
{
    public constructor(validationError: ValidationError)
    {
        super();
        this.message = `Validation failed: ${JSON.stringify(validationError)}`;
        this.name = "ChaiValidationError";
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