let element:HTMLElement|undefined = undefined;
let event = new Event("input", { bubbles: true });

export default
{
    mounted(el: any)
    {
        if (el == undefined) return;
        (el as HTMLElement).addEventListener("keypress", validateType);
        (el as HTMLElement).addEventListener("paste", validatePaste);
        (el as HTMLElement).addEventListener("change", validateIMEType);
        element = el;
    }
}

function validateIMEType(evt: Event)
{
    let tagName = (evt.target as HTMLElement).tagName;
    if (tagName != "INPUT" && tagName != "TEXTAREA") return;
    let element = evt.target as HTMLTextAreaElement|HTMLInputElement;
    if (!isStringASCII(element.value)) 
    {
        element.value = removeNonASCII(element.value);
        element.dispatchEvent(event);
    }
}

function removeNonASCII(str:string): string { return str.replace(/[^\x00-\x7F]/g, ""); };

function isStringASCII(str:string): boolean { return /^[\x00-\x7F]*$/.test(str); }

function validatePaste(evt: ClipboardEvent): void
{
    let str = evt.clipboardData?.getData('text');
    if (str == undefined) return evt.preventDefault();
    else if (!isStringASCII(str)) evt.preventDefault();
}

function validateType (evt: KeyboardEvent): void 
{
    const keyPressed: string = evt.key;
    if (!isStringASCII(keyPressed)) evt.preventDefault();
}