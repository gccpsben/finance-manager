export function extractFileExtension(fileName: string): string | undefined
{
    const re = /(?:\.([^.]+))?$/;
    const result = re.exec(fileName);
    return (result ?? [])[1]?.toString();
}