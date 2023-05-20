const logNPM = require('log-to-file');
const colors = require("chalk");

let pastLines:any = [];

async function _log(arg, color)
{
    var colorMethod = colors[color];
    console.log(colorMethod(arg));
    pastLines.push({message:arg, date: new Date().toLocaleString(), color:color});
    if (pastLines.length > 10000) pastLines.shift();
}

export function getLog(numberOfLastLines?: number)
{
    if (numberOfLastLines == 0 || numberOfLastLines == undefined || numberOfLastLines > pastLines.length ) return pastLines;
    else { return pastLines.slice(pastLines.length - numberOfLastLines); }
}

export function log(arg:any, logToFile:boolean=true)
{
    console.log(arg);
    if (logToFile) { logNPM(arg, "./log.log"); }
}

export function logRed(arg:any, logToFile:boolean=true)
{
    _log(arg, "red");
    if (logToFile) { logNPM(arg, "./log.log"); }
}

export function logGreen(arg:any, logToFile:boolean=true)
{
    _log(arg, "green");
    if (logToFile) { logNPM(arg, "./log.log"); }
}

export function logBlue(arg:any, logToFile:boolean=true)
{
    _log(arg, "blue");
    if (logToFile) { logNPM(arg, "./log.log"); }
}

export function logYellow(arg:any, logToFile:boolean=true)
{
    _log(arg, "yellow");
    if (logToFile) { logNPM(arg, "./log.log"); }
}