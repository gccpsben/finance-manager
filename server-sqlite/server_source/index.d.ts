
export type PickByType<T, Value> = { [P in keyof T as T[P] extends Value | undefined ? P : never]: T[P] };
export type OmitByType<T, Value> = { [P in keyof T as T[P] extends Value | undefined ? never : P]: T[P] };
export type PartialNull<T> = { [key in keyof T]: T[key] | null };
export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
export type UnionToIntersection<U> =
    (U extends unknown ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never
export type NoUnion<Key> =
    // If this is a simple type UnionToIntersection<Key> will be the same type, otherwise it will an intersection of all types in the union and probably will not extend `Key`
    [Key] extends [UnionToIntersection<Key>] ? Key : never;
export type Variant<Name extends string, Props> = [Name, Props];
// export type IdBound<T> = T & { id: string };