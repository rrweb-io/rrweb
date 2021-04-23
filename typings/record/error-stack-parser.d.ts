export declare class StackFrame {
    private fileName;
    private functionName;
    private lineNumber?;
    private columnNumber?;
    constructor(obj: {
        fileName?: string;
        functionName?: string;
        lineNumber?: number;
        columnNumber?: number;
    });
    toString(): string;
}
export declare const ErrorStackParser: {
    parse: (error: Error) => StackFrame[];
    extractLocation: (urlLike: string) => (string | undefined)[];
    parseV8OrIE: (error: {
        stack: string;
    }) => StackFrame[];
    parseFFOrSafari: (error: {
        stack: string;
    }) => StackFrame[];
    parseOpera: (e: {
        stacktrace?: string;
        message: string;
        stack?: string;
    }) => StackFrame[];
    parseOpera9: (e: {
        message: string;
    }) => StackFrame[];
    parseOpera10: (e: {
        stacktrace: string;
    }) => StackFrame[];
    parseOpera11: (error: {
        stack: string;
    }) => StackFrame[];
};
