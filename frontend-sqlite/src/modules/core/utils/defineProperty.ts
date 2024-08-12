import { ref, type UnwrapRef } from "vue";

export interface propDefinition<T, PropName extends string>
{
    default: T | undefined | null,
    withEmits?: boolean,
    emitFunc: ((event: `update:${PropName}`, ...args: any[]) => void) | undefined,
    props: { readonly [K in PropName]?: T }
};

/** Use null to tell this function to treat prop as uncontrolled */
export function defineProperty<T, PropName extends string>
(
    propName: PropName, 
    config: propDefinition<T, PropName>
)
{
    // Controlled: State managed by parents
    // Uncontrolled: State managed by component itself

    const checkIsControlled = () => config.props[propName] !== null;
    const uncontrolledRef = ref<T | undefined | null>(config.default);
    const propEmit = (newVal: T) => 
    {
        if (config.withEmits && config.emitFunc) config.emitFunc(`update:${propName}`, newVal);
        uncontrolledRef.value = newVal as UnwrapRef<T>;
    };

    return {
        checkIsControlled: checkIsControlled,
        propEmit: propEmit,
        get: () => { return checkIsControlled() ? config.props[propName] : uncontrolledRef.value },
        set: (val: T) => 
        {
            if (checkIsControlled()) propEmit(val);
            else uncontrolledRef.value = val as UnwrapRef<T>;
        }
    }   
}