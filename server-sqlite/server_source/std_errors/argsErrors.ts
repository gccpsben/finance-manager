import { MonadError } from "./monadError.ts";

export type ComparisonType = "LARGER_THAN" |
    "LARGER_THAN_OR_EQUAL" |
    "SMALLER_THAN" |
    "SMALLER_THAN_OR_EQUAL" |
    "EQUAL" |
    "NOT_EQUAL";

export class ConstantComparisonError<T> extends MonadError<typeof ConstantComparisonError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public argName: string;
    public argValue: T;
    public constant: T;
    public expectedComparison: ComparisonType;

    constructor(argName: string, argValue: T, constant: T, expectedComparison: ComparisonType)
    {
        super
        (
            ConstantComparisonError.ERROR_SYMBOL,
            `The received argument "${argName}" (value: ${argValue}) and the constant ${constant} must fulfill ${expectedComparison}`
        );
        this.name = this.constructor.name;
        this.expectedComparison = expectedComparison;
        this.argName = argName;
        this.argValue = argValue;
        this.constant = constant;
        this.expectedComparison = expectedComparison;
    }
}

export class ArgsComparisonError<T> extends MonadError<typeof ArgsComparisonError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public arg1Name: string;
    public arg2Name: string;
    public arg1Value: T;
    public arg2Value: T;
    public expectedComparison: ComparisonType;

    constructor(arg1Name: string, arg1Value: T, arg2Name: string, arg2Value: T, expectedComparison: ComparisonType)
    {
        super
        (
            ArgsComparisonError.ERROR_SYMBOL,
            `The arguments "${arg1Name} (value: ${arg1Value})" and "${arg2Name} (value: ${arg2Value})" fulfill ${expectedComparison}`
        );
        this.name = this.constructor.name;
        this.expectedComparison = expectedComparison;
        this.arg1Name = arg1Name;
        this.arg1Value = arg1Value;
        this.arg2Name = arg2Name;
        this.arg2Value = arg2Value;
    }
}