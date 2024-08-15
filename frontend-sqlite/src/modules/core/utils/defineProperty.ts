import { ref, type UnwrapRef } from "vue";

export interface propDefinition<T, PropName extends string, Props extends { [K in PropName]: T }>
{
    withEmits?: boolean,
    emitFunc: ((event: `update:${PropName}`, ...args: any[]) => void) | undefined,
    props: Props
};


/** Use null to tell this function to treat prop as uncontrolled */
export function defineProperty<T, PropName extends string, Props extends { [K in PropName]: T }>
(
    propName: PropName, 
    config: propDefinition<T, PropName, Props>
)
{
    // Controlled: State managed by parents
    // Uncontrolled: State managed by component itself

    const checkIsControlled = () => config.props[propName] !== null;
    const uncontrolledRef = ref<T>(config.props[propName]);
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
        },
        uncontrolledRef
    }   
}