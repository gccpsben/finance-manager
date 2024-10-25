export default
{
    mounted: (el:Element, binding:any) => { apply(binding.value, el); },
    updated: (el:Element, binding:any) => { apply(binding.value, el); },

}

function apply(str:string, el: Element)
{
    let result = parse(str);
    result?.classes.forEach(x => el.classList.add(x));
    if (result?.id) el.id = result.id;
}

function parse(str:string)
{
    try
    {
        let val:string = str;
        let firstChar = val[0]; let lastChar = val[val.length - 1];

        if (val.trim().length <= 1) throw new Error();
        if (val.includes(' ') || val.includes('.#') || val.includes('#.')) throw new Error();
        if (count(val.split(''), x => x == '#') >= 2) throw new Error();
        if (firstChar != '.' && firstChar != "#") throw new Error();
        if (lastChar == '.' || lastChar == "#") throw new Error();

        let currentMode: '.'|'#' = firstChar;
        let classes:string[] = []; let id:string|undefined = "";
        for (let i = 0; i < val.length; i++)
        {
            if (val[i] == '#') { currentMode = "#"; continue; }
            else if (val[i] == '.') { currentMode = "."; classes.push(""); continue; }

            if (currentMode == "#") id += val[i];
            else classes[classes.length - 1] += val[i];
        }

        if (id == '') id = undefined;

        return {"classes":classes, id: id}
    }
    catch(ex)
    {
        console.warn(`Invalid argument "${str}" passed in v-basic.`);
    }
}

export function count<T>(array:T[], predicate: (item:T, itemIndex: number) => boolean): number
{
    let output = 0;
    for (let i = 0; i < array.length; i++) if (predicate(array[i], i)) output++;
    return output;
}