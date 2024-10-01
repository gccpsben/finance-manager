const padStart = (n:number, x = 2) => n.toString().padStart(x, '0');
export function formatDate(date:Date, format = "YYYY-MM-DD hh:mm:ss")
{
    const mapper = {
        "YYYY": padStart(date.getFullYear(), 4),
        "MM": padStart(date.getMonth() + 1, 2),
        "DD": padStart(date.getDate(), 2),
        "hh": padStart(date.getHours(), 2),
        "mm": padStart(date.getMinutes(), 2),
        "ss": padStart(date.getSeconds(), 2),
        "ms": padStart(date.getMilliseconds(), 3),
    };

    let mappedOutput = format;
    for (const mapRule of Object.entries(mapper))
        mappedOutput = mappedOutput.replace(mapRule[0], mapRule[1]);

    return mappedOutput;
}

export function extractDatePart(date: Date)
{
    let datePart = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return datePart;
}

export function extractTimePart(date: Date)
{
    const timePart = `${padStart(date.getHours())}:${padStart(date.getMinutes())}:${padStart(date.getSeconds())}`;
    return timePart;
}

export function isDateValid(date: Date)
{
    return !isNaN(date.getTime());
}