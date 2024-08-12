const keysAllowed: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '-'];
let element:any = undefined;
let event = new Event("input", { bubbles: true });

export default
{
    mounted(el:any, binding:any)
    {
        if (el == undefined) return;
        (el as HTMLElement).addEventListener("keypress", validateType);
        (el as HTMLElement).addEventListener("paste", validatePaste);
        (el as HTMLElement).addEventListener("change", validateChange);
        element = el;
    }
}

function validateChange(evt: Event)
{
    let tagName = (evt.target as HTMLElement).tagName;
    if (tagName != "INPUT" && tagName != "TEXTAREA") return;
    let element = evt.target as HTMLTextAreaElement|HTMLInputElement;

    if (!isNumeric(element.value)) 
    { 
        element.value = "0";
        element.dispatchEvent(event);
    }
}

function isNumeric(str:string) 
{
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str as any) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

function isStringNumberLike(str:string): boolean
{
    let charArray = str.split('');
    return charArray.every(x => keysAllowed.includes(x)) && countChar(str, '.') <= 1;
}

function validatePaste(evt: ClipboardEvent): void
{
    let target: HTMLElement = evt.target as HTMLElement;
    let str = evt.clipboardData?.getData('text');
    let hasDot = (x:string) => countChar(x, '.') > 0;
    if (str == undefined) return evt.preventDefault();
    else if (!isStringNumberLike(str)) evt.preventDefault();
    if (target.tagName != "TEXTAREA" && target.tagName != "INPUT") return;
    if (hasDot(str) && hasDot((target as HTMLTextAreaElement | HTMLInputElement).value)) evt.preventDefault();
}

function validateType (evt: KeyboardEvent): void 
{
    const keyPressed: string = evt.key;
    let charIsDot = keyPressed == '.';
    let target: HTMLElement = evt.target as HTMLElement;
    let checkForMultipleDots = (str:string) => { if (countChar(str, '.') >= 1 && charIsDot) evt.preventDefault(); };
    if (target.tagName == "TEXTAREA" || target.tagName == "INPUT") checkForMultipleDots((target as HTMLTextAreaElement).value);    
    if (!keysAllowed.includes(keyPressed)) evt.preventDefault();
}

function countChar(str:string, char:string)
{
    let output = 0;
    for (let i = 0; i < str.length; i++) if (str[i] == char) output++;
    return output;
}