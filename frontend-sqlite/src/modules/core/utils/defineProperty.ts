import { ref, type UnwrapRef } from "vue";

export const Uncontrolled: unique symbol = Symbol('define-property-uncontrolled');

export type PropDefinition<T, PropName extends string, Props extends { [K in PropName]: T | typeof Uncontrolled }> =
{
    emitFunc: ((event: `update:${PropName}`, ...args: any[]) => void) | undefined,
    props: Props,

    /** Default must be provided if the property is "uncontrollable" (aka with `| typeof Uncontrolled` as type),
     *  since the parent can change this component to uncontrolled at any moment. */
    default: Exclude<T, typeof Uncontrolled>
};

export function defineProperty<
    T,
    PropName extends string,
    Props extends { [K in PropName]: T | typeof Uncontrolled }
>
(
    propName: PropName, options: PropDefinition<T, PropName, Props>
)
{
    const _isUncontrolled = ref(false);

    /**
     * It's possible that uncontrolled is allowed, but default is not provided.
     * Normally this should yield an error in IDE and type-check, so we can assume it's not null here.
     **/
    const _uncontrolledRef = ref<T>(options.default!);
    const get = (): T =>
    {
        if ( options.props[propName] === Uncontrolled) return _uncontrolledRef.value as T;
        else return options.props[propName] as T;
    };
    const set = (val: T | typeof Uncontrolled): void =>
    {
        _isUncontrolled.value = val === Uncontrolled;
        if (val === Uncontrolled) return void((_uncontrolledRef.value as T) = options.default);
        if (options.emitFunc)
        {
            options.emitFunc(`update:${propName}`, val);
            _uncontrolledRef.value = val as UnwrapRef<T>;
        }
    };

    set(options.props[propName]);

    return {
        get,
        set
    }
}