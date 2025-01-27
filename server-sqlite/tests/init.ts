/// <reference lib="deno.ns" />

import { startServer } from "./domains/server/helpers.ts";
import { Server } from '../server_source/router/server.ts';

export let port: number | null = null;
export let server: Server | null = null;
export const getTestServerPath = () => `http://localhost:${port}`;

export async function ensureTestIsSetup()
{
    if (port !== null && server !== null) return;
    const startServerResult = await startServer();
    port = startServerResult.port;
    server = startServerResult.server;
}