export function isNumeric(s: string|null|undefined) {
    if (s === undefined || s === null) return false;
    if (s.trim() === '') return false;
    return !isNaN(+s) && isFinite(+s) && !/e/i.test(s);
}