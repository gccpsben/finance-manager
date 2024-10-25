/**
 * A shortcut directive to set grid-area in without using style. Expect a string as the argument.
 */
export default
{
    mounted(el:HTMLElement, binding: any)
    {
        el.style.gridArea = binding.value;
        if (binding.arg == 'class' || binding.modifiers.class == true)
            el.classList.add(binding.value)
    },
    updated(el:HTMLElement, binding: any)
    {
        el.style.gridArea = binding.value;
        if (binding.arg == 'class' || binding.modifiers.class == true)
            el.classList.add(binding.value);
    }
}