import { logGreen, logYellow } from "./extendedLog";
import * as fs from 'fs';

export let isSSLDefined = false;
export let sslKey:Buffer, sslCert:Buffer;

export function loadSSL()
{
    isSSLDefined = !!process.env.SSL_KEY_PATH && !!process.env.SSL_PEM_PATH;

    if (!isSSLDefined) logYellow("SSL_KEY_PATH or SSL_PEM_PATH isn't defined in the env file. Running in HTTP mode.");
    else 
    { 
        sslKey = fs.readFileSync(process.cwd() + process.env.SSL_KEY_PATH);
        sslCert = fs.readFileSync(process.cwd() + process.env.SSL_PEM_PATH);
        logGreen("Loaded SSL key and cert!");
    }   
}

export default loadSSL;