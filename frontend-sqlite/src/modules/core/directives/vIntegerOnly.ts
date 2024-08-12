const keysAllowed: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-'];
let element:HTMLElement|undefined = undefined;
let event = new Event("input", { bubbles: true });

export default
{
    mounted(el: any)
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
    let el = evt.target as HTMLTextAreaElement|HTMLInputElement;
    if (!Number.isInteger(Number(el.value)))
    {
        el.value = "0";
        el.dispatchEvent(event);
    }
}

function validatePaste(evt: ClipboardEvent)
{
    let charArray = evt.clipboardData?.getData('text').split('');
    if (charArray == undefined) evt.preventDefault();
    else if (!charArray.every(x => keysAllowed.includes(x))) evt.preventDefault();
}

function validateType (evt: KeyboardEvent): void 
{
    const keyPressed: string = evt.key;
    if (!keysAllowed.includes(keyPressed)) evt.preventDefault();
}