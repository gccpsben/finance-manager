import { validate } from "class-validator";
import { BeforeInsert, BeforeUpdate } from "typeorm";
import { InternalValidationError } from "../router/validation.ts";
import { ExtendedLog } from "../debug/extendedLog.ts";
import { randomUUID } from "node:crypto";

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
            ExtendedLog.logRed(consoleMsg, false, true);
            ExtendedLog.logRed(logFileMsg, true, false);
            throw internalValidationError;
        }
    }
}