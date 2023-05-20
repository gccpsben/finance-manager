const https = require("https");

exports.getYesterday = function() { return exports.getYesterdayOf(new Date(Date.now())); }
exports.getYesterdayOf = function(dateTime: Date):Date
{
    var yesterday = new Date(dateTime.getTime());
    yesterday.setDate(dateTime.getDate() - 1);
    return yesterday;
}

exports.isDateWithin = (date:Date, from:Date, to:Date) => ((date.getTime() <= to.getTime() && date.getTime() >= from.getTime()));
exports.isDateOlderThanYesterday = (date:Date) => new Date().getTime() - date.getTime() > 8.64e+7;
exports.dateDiffMs = (firstDate:Date, secondDate:Date) => firstDate.getTime() - secondDate.getTime();
exports.daysInMs = (numberOfDays:number) => numberOfDays*86400000;

exports.min = function(array:Array<any>, valueProvider: ((item:any) => Number) | undefined)
{
    if (array.length == 0) return 0;
    var currentItem = undefined;
    var currentMin = Number.NaN;
    array.forEach(item => 
    {
        var value = valueProvider == undefined ? item : valueProvider(item);
        if (Number.isNaN(currentMin) || value < currentMin) { currentMin = value; currentItem = item; }
    });
    return currentItem;
}
exports.max = function(array:Array<any>, valueProvider: ((item:any) => Number) | undefined)
{
    if (array.length == 0) return 0;
    var currentItem = undefined;
    var currentMax = Number.NaN;
    array.forEach(item => 
    {
        var value = valueProvider == undefined ? item : valueProvider(item);
        if (Number.isNaN(currentMax) || value > currentMax) { currentMax = value; currentItem = item; }
    });
    return currentItem;
}
exports.ascending = function(array:Array<any>)
{
    array.sort((a,b) => { return a-b });
    return array;
} 
exports.decending = function(array:Array<any>)
{
    array.sort((a,b) => { return b-a });
    return array;
} 
exports.averageOf = function(array:Array<any>, keyName:any|undefined) 
{
    if (array.length == 0) return 0;
    var sum = 0; 
    array.forEach(item => 
    {
        if (keyName == undefined) sum += item;
        else sum += item[keyName];            
    });
    return sum / array.length;
}
exports.sumOf = function(array:Array<any>, keyName:any|undefined) 
{
    if (array.length == 0) return 0;
    var sum = 0; 
    array.forEach(item => 
    {
        if (keyName == undefined) sum += item;
        else sum += item[keyName];            
    });
    return sum;
}

exports.httpsRequest = function(options:any, onData:(chunk:string) => void | undefined, onClose:(wholeData:string) => void | undefined, onError:(err:string) => void | undefined):void
{
    var responseInString = ``;
    var request = https.request(options, res =>
    {
        res.on('data', data => 
        {
            responseInString += data; 
            if (onData) onData(data);
        });

        res.on("close", data =>
        {
            if (onClose) onClose(responseInString);
        });
    }).end();
    request.on("error", function(e){ if (onError) { onError(responseInString); console.log(e); } });
}
exports.hasJsonStructure = function(str) 
{
    if (typeof str !== 'string') return false;
    try 
    {
        const result = JSON.parse(str);
        const type = Object.prototype.toString.call(result);
        return type === '[object Object]' 
            || type === '[object Array]';
    } 
    catch (err) { return false; }
}
exports.debugMalformedJSON = function(jsonRawString:string, debugMessage:string|undefined)
{
    try
    {
        if (JSON.parse(jsonRawString))
        {
            return JSON.parse(jsonRawString);
        }
    }
    catch(err)
    {
        if (debugMessage) console.log(debugMessage);
        else console.log(err.toString())
        console.log(jsonRawString);
    }
}