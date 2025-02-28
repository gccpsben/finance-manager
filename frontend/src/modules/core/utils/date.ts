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

/**
* Get the passed time of a date relative to current time.
*/
export function getDateAge(epoch: number, relativeTo?: number | undefined)
{
    let msDiff = (relativeTo ?? Date.now()) - epoch;
    if (msDiff < 60000) return `${(msDiff / 1000).toFixed(0)}s`; // if < 1 min
    else if (msDiff < 3.6e+6) return `${(msDiff / 60000).toFixed(0)}m`; // if < 1 hour
    else if (msDiff < 8.64e+7) return `${(msDiff / (3.6e+6)).toFixed(0)}h`; // if < 1 day
    else return `${(msDiff / (8.64e+7)).toFixed(0)}d`;
}

/**
* Get the passed time of a date relative to current time.
*/
export function getDateAgeFull(
    epoch: number,
    mode: "combined" | "single" = 'combined',
    relativeTo?: number | undefined,)
{
    const { d: days, h: hours, m: minutes, s: seconds, ms } = getDateAgeFullComponents(epoch, mode, relativeTo);
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s ${ms}ms`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s ${ms}ms`;
    if (minutes > 0) return `${minutes}m ${seconds}s ${ms}ms`;
    if (seconds > 0) return `${seconds}s ${ms}ms`;
    return `${ms}ms`;
}

/**
 * Get the passed time of a date relative to current time.
 * `Combined` means that the difference is separated into components to ms/s/m/h/d.
 * `Single` means that the difference is represented by ms/s/m/h/d.
 */
export function getDateAgeFullComponents(
    epoch: number,
    mode: "combined" | "single" = 'combined',
    relativeTo?: number | undefined,
) {
    let msDiff = (relativeTo ?? Date.now()) - epoch;

    // コンポーネントを計算
    const ms = msDiff % 1000; // ミリ秒
    const seconds = Math.floor((msDiff / 1000) % 60); // 秒
    const minutes = Math.floor((msDiff / (1000 * 60)) % 60); // 分
    const hours = Math.floor((msDiff / (1000 * 60 * 60)) % 24); // 時間
    const days = Math.floor(msDiff / (1000 * 60 * 60 * 24)); // 日

    // モードに応じて結果を返す
    if (mode === "combined") {
        return {
            ms: ms,
            s: seconds,
            m: minutes,
            h: hours,
            d: days
        };
    } else { // mode === "single"
        return {
            ms: msDiff,
            s: Math.floor(msDiff / 1000),
            m: Math.floor(msDiff / (1000 * 60)),
            h: Math.floor(msDiff / (1000 * 60 * 60)),
            d: Math.floor(msDiff / (1000 * 60 * 60 * 24))
        };
    }
}

/** Get the epoch of the first day of the current month of a given timezone (fallback to system timezone). */
export function getCurrentMonthStartEpoch(timezone?: string)
{
    // Get the current date
    const now = new Date();

    // Create a new date object for the first day of the current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Convert to the specified timezone
    const options = { timeZone: timezone };
    const startOfMonthInLocalTime = new Date(startOfMonth.toLocaleString('en-US', options));

    // Return the epoch time in milliseconds
    return startOfMonthInLocalTime.getTime();
}

export function getStartOfWeekEpoch(timezone?: string): number
{
    // Get the current date
    const now = new Date();

    // Get the current day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayOfWeek = now.getUTCDay();

    // Calculate the number of days to subtract to get to the previous Monday
    const daysToSubtract = (dayOfWeek + 6) % 7; // Adjust to start week on Monday

    // Create a new date object for the start of the week (previous Monday)
    const startOfWeek = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysToSubtract);

    // Convert to the specified timezone
    const options = { timeZone: timezone, hour12: false };
    const startOfWeekInLocalTime = new Date(startOfWeek.toLocaleString('en-US', options));

    // Return the epoch time in milliseconds
    return startOfWeekInLocalTime.getTime();
};