import { validate } from "class-validator";
import { BeforeInsert, BeforeUpdate, ValueTransformer } from "typeorm";
import { InternalValidationError } from "../router/validation.ts";
import { ExtendedLogger } from "../debug/extendedLog.ts";
import { randomUUID } from "node:crypto";

let GlobalEntityValidationLogger: ExtendedLogger | null = null;
export function setGlobalEntityValidationLogger(logger: ExtendedLogger | null)
{
    GlobalEntityValidationLogger = logger;
}

export class EntityClass
{
    @BeforeInsert()
    @BeforeUpdate()
    public async validate()
    {
        const errors = await validate(this);
        if (errors?.length)
        {
            const internalValidationError = new InternalValidationError(errors[0]);
            const msgUUID = randomUUID();
            const consoleMsg = `One of the EntityClass failed internal validator. See log files for more info. (ErrorRefNo: ${msgUUID})`;
            const logFileMsg = `One of the EntityClass failed internal validator (ErrorRefNo: ${msgUUID}).`
            + `\n${JSON.stringify(internalValidationError, null, 4)}`
            + `\nAbove error stack trace: ${internalValidationError.stack}`;
            GlobalEntityValidationLogger?.logRed(consoleMsg, false, true);
            GlobalEntityValidationLogger?.logRed(logFileMsg, true, false);
            throw internalValidationError;
        }
    }
}

export const BigIntNumberTransformer =
{
    from(databaseType: unknown | null) {
        return (databaseType === undefined || databaseType === null) ? null : parseInt(`${databaseType}`); },
    to(entityType: unknown | null)  {
        return (entityType === undefined || entityType === null) ? null : entityType
    }
} satisfies ValueTransformer;