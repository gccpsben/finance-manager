import { assertEquals } from "jsr:@std/assert/equals";
import { main } from "../../../server_source/entry.ts";
import { assertNotEquals } from "jsr:@std/assert/not-equals";
import { Server } from "../../../server_source/router/server.ts";
import { Database } from '../../../server_source/db/db.ts';
import { ExtendedLogger } from "../../../server_source/debug/extendedLog.ts";
import { EnvManager } from '../../../server_source/env.ts';
import { match, P } from 'ts-pattern';
import { panic } from "../../../server_source/std_errors/monadError.ts";

export async function startServer
(
    env: ["path", string | undefined] | ["rawJson", string] = ['path', './.test.json']
)
{
    let server: Server | null = null;

    const serverCreated = (await main(env))!;
    assertEquals(typeof serverCreated, 'object');
    assertNotEquals(serverCreated, null);
    assertNotEquals(serverCreated.getServerPort(), null);
    assertNotEquals(serverCreated.CRONRunner, null);
    server = serverCreated as Server;

    return { server: server!, port: server!.getServerPort()! };
}

export async function resetDatabase()
{
    const env = match(EnvManager.getEnvSettings())
        .with(['unloaded', P._], () => { throw panic("No env available in resetDatabase."); })
        .with(['loaded', P.select()], env => env)
        .exhaustive();

    try { if (Database.AppDataSource?.isInitialized) await Database.AppDataSource?.dropDatabase(); } catch(_) { /** ignore */ }
    try { if (Database.AppDataSource?.isInitialized) await Database.AppDataSource?.destroy(); } catch(_) { /** ignore */ }
    await Database.init(new ExtendedLogger(env.logs.logFolderPath), env);
}