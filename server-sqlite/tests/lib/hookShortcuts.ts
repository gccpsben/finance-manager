import { ensureBodyConfirmToModel, HTTPTestsBuilder, TestUserDict, TestUserEntry, UnitTestEndpoints } from '../.index.spec.js';
import { IsString } from 'class-validator';

export class HookShortcuts
{
    /** Register all users defined in `usersCreds` using the `before` hook. Token will be set on each object after registering. */
    public static registerMockUsers(chai: Chai.ChaiStatic, serverURL: string, usersCreds: TestUserDict, resetDatabase: Function)
    {
        before(async () =>
        { 
            await resetDatabase(); 
    
            for (let [key, value] of Object.entries(usersCreds))
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 200,
                    endpoint: UnitTestEndpoints.userEndpoints['post'],
                    serverURL: serverURL,
                    body: { username: value.username, password: value.password },
                    method: "POST"
                }, chai);
    
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 200,
                    endpoint: UnitTestEndpoints.loginEndpoints['post'],
                    serverURL: serverURL,
                    body: { username: value.username, password: value.password },
                    method: "POST",
                    responseValidator: async function (res)
                    {
                        // @ts-ignore
                        class expectedBodyType { @IsString() token: string; }
                        const transformedObject = await ensureBodyConfirmToModel(expectedBodyType, res.body);
                        usersCreds[key].token = transformedObject.token;
                    }
                }, chai);
            }
        });
    }

    /** Register all users defined in `usersCreds` using the `before` hook. Token will be set on each object after registering. */
    public static registerMockUsersArray(chai: Chai.ChaiStatic, serverURL: string, usersCreds: TestUserEntry[], resetDatabase: Function)
    {
        before(async () =>
        { 
            await resetDatabase(); 
    
            for (let user of usersCreds)
            {
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 200,
                    endpoint: UnitTestEndpoints.userEndpoints['post'],
                    serverURL: serverURL,
                    body: { username: user.username, password: user.password },
                    method: "POST"
                }, chai);
    
                await HTTPTestsBuilder.runRestExecution(
                {
                    expectedStatusCode: 200,
                    endpoint: UnitTestEndpoints.loginEndpoints['post'],
                    serverURL: serverURL,
                    body: { username: user.username, password: user.password },
                    method: "POST",
                    responseValidator: async function (res)
                    {
                        // @ts-ignore
                        class expectedBodyType { @IsString() token: string; }
                        const transformedObject = await ensureBodyConfirmToModel(expectedBodyType, res.body);
                        user.token = transformedObject.token;
                    }
                }, chai);
            }
        });
    }
}