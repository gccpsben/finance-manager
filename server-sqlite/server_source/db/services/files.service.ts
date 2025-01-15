import { Database } from "../db.js";
import { UserNotFoundError, UserService } from "./user.service.js";
import { MonadError, panic } from "../../std_errors/monadError.js";
import { AppendBytesCommitFileIOError, AppendBytesOutOfBoundError, AppendBytesSessionNotFoundError, AppendBytesUserMismatchError, AppendBytesWriteBufferIOError } from "../../io/fileReceiver.js";

export class FileNotFoundError extends MonadError<typeof FileNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public userId: string;
    public fileId: string;

    constructor(userId: string, fileId: string)
    {
        super(FileNotFoundError.ERROR_SYMBOL, `The given file id \"${fileId}\" is not found.`);
        this.name = this.constructor.name;
        this.userId = userId;
        this.fileId = fileId;
    }
}

export class FilesService
{

    public static async appendBytes(userId: string, sessionId: string, buffer: Buffer)
    {
        // Ensure user exists
        const userFetchResult = await UserService.getUserById(userId);
        if (userFetchResult === null) return new UserNotFoundError(userId);

        let appendBytesResult = await Database.getFileReceiver()!.appendBytes(
            userId,
            sessionId,
            buffer
        );

        if (appendBytesResult instanceof AppendBytesOutOfBoundError) return appendBytesResult;
        if (appendBytesResult instanceof AppendBytesWriteBufferIOError) return appendBytesResult;
        if (appendBytesResult instanceof AppendBytesSessionNotFoundError) return appendBytesResult;
        if (appendBytesResult instanceof AppendBytesUserMismatchError) return appendBytesResult;

        let fileIdCreated: null | string = null;
        const session = Database.getFileReceiver()!.getSession(sessionId);
        if (!session) throw panic(`Session id not found`);

        if (appendBytesResult === 'FINISHED')
        {
            let transactionalContext: Awaited<ReturnType<typeof Database.createTransactionalContext>> | null = null;
            try
            {
                transactionalContext = await Database.createTransactionalContext();

                // Add entry to SQL
                // TODO: Wrap in service layer
                const newFileRow = await Database.getFileRepository()!.saveNewFile(userId, session.fileNameReadable, transactionalContext.queryRunner);

                // Move file from tmp to files storage
                const moveResult = await Database.getFileReceiver()!.commitFile(sessionId);

                if (moveResult instanceof AppendBytesCommitFileIOError)
                {
                    // Rollback SQL
                    await transactionalContext.endFailure();
                    return moveResult;
                }

                fileIdCreated = newFileRow.id;
                await transactionalContext.endSuccess();
            }
            catch(e)
            {
                if (transactionalContext) await transactionalContext!.endFailure();
                throw e; // trigger 500
            }
        }

        return {
            state: appendBytesResult,
            fileIdCreated: fileIdCreated
        } as const;
    }
}