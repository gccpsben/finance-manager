export function waitUntil(predicate: () => boolean, interval: number): Promise<void>
{
    return new Promise(resolve =>
    {
        const checkCondition = () =>
        {
            if (predicate()) resolve();
            setTimeout(checkCondition, interval);
        };

        checkCondition();
    });
}