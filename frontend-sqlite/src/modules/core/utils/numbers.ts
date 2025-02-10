export function isNumeric(s: string|null|undefined) {
    if (s === undefined || s === null) return false;
    if (s.trim() === '') return false;
    return !isNaN(+s) && isFinite(+s) && !/e/i.test(s);
}

export function roundToSignificantFigures(numStr: string, significantFigures: number): string
{
    const num = parseFloat(numStr);
    if (!isFinite(num)) throw new Error("Invalid number provided.");
    if (significantFigures <= 0) throw new Error("Significant figures must be greater than zero.");
    if (num === 0) return '0';
    const d = Math.ceil(Math.log10(Math.abs(num))); // Determine the digit order.
    const power = significantFigures - d; // Calculate the power of 10.
    const magnitude = Math.pow(10, power); // Calculate the magnitude.
    const shifted = Math.round(num * magnitude); // Shift the decimal point.
    return (shifted / magnitude).toString(); // Shift back and convert to string.
}