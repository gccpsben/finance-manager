var https = require("https");
exports.getYesterday = function () { return exports.getYesterdayOf(new Date(Date.now())); };
exports.getYesterdayOf = function (dateTime) {
    var yesterday = new Date(dateTime.getTime());
    yesterday.setDate(dateTime.getDate() - 1);
    return yesterday;
};
exports.isDateWithin = function (date, from, to) { return ((date.getTime() <= to.getTime() && date.getTime() >= from.getTime())); };
exports.isDateOlderThanYesterday = function (date) { return new Date().getTime() - date.getTime() > 8.64e+7; };
exports.dateDiffMs = function (firstDate, secondDate) { return firstDate.getTime() - secondDate.getTime(); };
exports.daysInMs = function (numberOfDays) { return numberOfDays * 86400000; };
exports.min = function (array, valueProvider) {
    if (array.length == 0)
        return 0;
    var currentItem = undefined;
    var currentMin = Number.NaN;
    array.forEach(function (item) {
        var value = valueProvider == undefined ? item : valueProvider(item);
        if (Number.isNaN(currentMin) || value < currentMin) {
            currentMin = value;
            currentItem = item;
        }
    });
    return currentItem;
};
exports.max = function (array, valueProvider) {
    if (array.length == 0)
        return 0;
    var currentItem = undefined;
    var currentMax = Number.NaN;
    array.forEach(function (item) {
        var value = valueProvider == undefined ? item : valueProvider(item);
        if (Number.isNaN(currentMax) || value > currentMax) {
            currentMax = value;
            currentItem = item;
        }
    });
    return currentItem;
};
exports.ascending = function (array) {
    array.sort(function (a, b) { return a - b; });
    return array;
};
exports.decending = function (array) {
    array.sort(function (a, b) { return b - a; });
    return array;
};
exports.averageOf = function (array, keyName) {
    if (array.length == 0)
        return 0;
    var sum = 0;
    array.forEach(function (item) {
        if (keyName == undefined)
            sum += item;
        else
            sum += item[keyName];
    });
    return sum / array.length;
};
exports.sumOf = function (array, keyName) {
    if (array.length == 0)
        return 0;
    var sum = 0;
    array.forEach(function (item) {
        if (keyName == undefined)
            sum += item;
        else
            sum += item[keyName];
    });
    return sum;
};
exports.httpsRequest = function (options, onData, onClose, onError) {
    var responseInString = "";
    var request = https.request(options, function (res) {
        res.on('data', function (data) {
            responseInString += data;
            if (onData)
                onData(data);
        });
        res.on("close", function (data) {
            if (onClose)
                onClose(responseInString);
        });
    }).end();
    request.on("error", function (e) { if (onError) {
        onError(responseInString);
        console.log(e);
    } });
};
exports.hasJsonStructure = function (str) {
    if (typeof str !== 'string')
        return false;
    try {
        var result = JSON.parse(str);
        var type = Object.prototype.toString.call(result);
        return type === '[object Object]'
            || type === '[object Array]';
    }
    catch (err) {
        return false;
    }
};
exports.debugMalformedJSON = function (jsonRawString, debugMessage) {
    try {
        if (JSON.parse(jsonRawString)) {
            return JSON.parse(jsonRawString);
        }
    }
    catch (err) {
        if (debugMessage)
            console.log(debugMessage);
        else
            console.log(err.toString());
        console.log(jsonRawString);
    }
};
