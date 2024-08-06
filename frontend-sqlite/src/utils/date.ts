export function formatDate(date:Date)
{
    const padStart = (n:number) => n.toString().padStart(2, '0');
    let datePart = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    let timePart = `${padStart(date.getHours())}:${padStart(date.getMinutes())}:${padStart(date.getSeconds())}`;
    return `${datePart} ${timePart}`;
}