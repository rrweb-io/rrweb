export declare type PackFn<T extends {
    timestamp: number;
}> = (event: T) => string;
export declare type UnpackFn<T extends {
    timestamp: number;
}> = (raw: string) => T;
export declare type eventWithTimeAndPacker<T extends {
    timestamp: number;
}> = T & {
    v: string;
};
export declare const MARK = "v1";
