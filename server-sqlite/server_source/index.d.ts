export type FunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[keyof T];
export type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;
export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;
export type PickByType<T, Value> = { [P in keyof T as T[P] extends Value | undefined ? P : never]: T[P] };
export type OmitByType<T, Value> = { [P in keyof T as T[P] extends Value | undefined ? never : P]: T[P] };
export type SQLitePrimitiveOnly<T> = 
{ 
    [P in keyof T as T[P] extends (boolean | number | string | null | undefined | Date) ? P : never]: T[P] 
};