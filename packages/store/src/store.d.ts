export interface StoreConfig<T> {
    name: string;
    state: T;
    actions?: Record<string, (this: T & Record<string, any>, ...args: any[]) => any>;
    persist?: 'local' | 'session' | false;
}
export type Store<T, A> = {
    [K in keyof T]: () => T[K];
} & {
    [K in keyof T as `set${Capitalize<string & K>}`]: (val: T[K]) => void;
} & A;
export declare function store<T extends Record<string, any>, A extends Record<string, Function>>(config: StoreConfig<T>): Store<T, A>;
//# sourceMappingURL=store.d.ts.map