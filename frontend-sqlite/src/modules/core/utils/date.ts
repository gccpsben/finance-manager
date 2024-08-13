export function formatDate(date:Date)
{
    return `${extractDatePart(date)} ${extractTimePart(date)}`;
}

export function extractDatePart(date: Date)
{
    let datePart = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return datePart;
}

export function extractTimePart(date: Date)
{
    const padStart = (n:number) => n.toString().padStart(2, '0');
    let timePart = `${padStart(date.getHours())}:${padStart(date.getMinutes())}:${padStart(date.getSeconds())}`;
    return timePart;
}