import * as fs from 'fs';
import { MonadError, panic } from '../std_errors/monadError.js';
import path from 'path';

export class AppendBytesCommitFileIOError<T> extends MonadError<typeof AppendBytesCommitFileIOError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public sessionId: string;
    public error: T;

    constructor(sessionId: string, error: T)
    {
        super(AppendBytesCommitFileIOError.ERROR_SYMBOL, `IO Error occurred while committing tmp file: ${error}.`);
        this.name = this.constructor.name;
        this.sessionId = sessionId;
        this.error = error;
    }
}

export class AppendBytesWriteBufferIOError<T> extends MonadError<typeof AppendBytesWriteBufferIOError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public sessionId: string;
    public error: T;

    constructor(sessionId: string, error: T)
    {
        super(AppendBytesWriteBufferIOError.ERROR_SYMBOL, `IO Error occurred while writing buffer: ${error}.`);
        this.name = this.constructor.name;
        this.sessionId = sessionId;
        this.error = error;
    }
}

export class AppendBytesSessionNotFoundError extends MonadError<typeof AppendBytesSessionNotFoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public sessionId: string;

    constructor(sessionId: string)
    {
        super(AppendBytesSessionNotFoundError.ERROR_SYMBOL, `Cannot find file session with id ${sessionId}`);
        this.name = this.constructor.name;
        this.sessionId = sessionId;
    }
}

export class AppendBytesUserMismatchError extends MonadError<typeof AppendBytesUserMismatchError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public expectedUserId: string;
    public givenUserId: string;

    constructor(
        expectedUserId: string,
        givenUserId: string
    )
    {
        super(AppendBytesUserMismatchError.ERROR_SYMBOL, `Expected user id of ${expectedUserId} but got ${givenUserId}`);
        this.name = this.constructor.name;
        this.expectedUserId = expectedUserId;
        this.givenUserId = givenUserId;
    }
}

export class AppendBytesOutOfBoundError extends MonadError<typeof AppendBytesOutOfBoundError.ERROR_SYMBOL>
{
    static readonly ERROR_SYMBOL: unique symbol;
    public givenBytesLength: number;
    public maxBytesLength: number;
    public minBytesLength: number;
    public userId: string;

    constructor(
        givenBytesLength: number,
        maxBytesLength: number,
        minBytesLength: number,
        userId: string
    )
    {
        super(AppendBytesOutOfBoundError.ERROR_SYMBOL, `The given buffer is of length ${givenBytesLength}, which is outside of the allowed range ${minBytesLength} - ${maxBytesLength}`);
        this.name = this.constructor.name;
        this.givenBytesLength = givenBytesLength;
        this.maxBytesLength = maxBytesLength;
        this.minBytesLength = minBytesLength;
        this.userId = userId;
    }
}

export type FileReceiverOptions =
{
    fs:
    {
        readFile: typeof fs.readFile,
        writeFile: typeof fs.writeFile,
        createReadStream: typeof fs.createReadStream,
        createWriteStream: typeof fs.createWriteStream,
        rename: typeof fs.rename,
        openPromise: typeof fs.promises.open
    },
    sessionIdGenerator: (userId: string, fileReceiver: FileReceiver) => string,
    tempFolderFullPath: string,
    filesFolderFullPath: string,
    timeoutMs: number,
    timeoutCheckMs: number
};

export type FileReceiverSession =
{
    committedBytes: number,
    totalBytes: number,
    creationDate: number,
    userId: string,
    lastSuccessfulCommitDate: number | null,
    fileHandle: fs.promises.FileHandle,
    writeStream: fs.WriteStream,

    /** Filename for the file uploaded. Notice that this will not used in both tmp and files storage, but will be stored in SQL instead. */
    fileNameReadable: string
};

/**
 * A class that accept chunked-upload of files via sessions.
 * ```
 * ```
 * By default, all upload-in-progress files are stored in the given temp folder via the given `fs` interface,
 * with a name of the given session-id.
 * ```
 * ```
 * The given callback will be fired when the files are finished uploading, allowing consumer to
 * move the file to the actual desired location.
 */
export class FileReceiver
{
    evictionTimer: NodeJS.Timeout;
    sessions: { [sessionId: string]: FileReceiverSession } = {};
    #options: FileReceiverOptions;
    readFile: typeof fs.readFile;
    writeFile: typeof fs.writeFile;
    createReadStream: typeof fs.createReadStream;
    createWriteStream: typeof fs.createWriteStream;
    openPromise: typeof fs.promises.open;

    public constructor(options: FileReceiverOptions)
    {
        this.#options = options;
        this.readFile = options.fs.readFile;
        this.writeFile = options.fs.writeFile;
        this.evictionTimer = setInterval(async () =>
        {
            const now = Date.now();
            const limit = this.#options.timeoutMs;
            for (const [id, session] of Object.entries(this.sessions))
            {
                if (session.lastSuccessfulCommitDate && now - session.lastSuccessfulCommitDate > limit)
                    await this.removeSession(id);
                else if (!session.lastSuccessfulCommitDate && now - session.creationDate > limit)
                    await this.removeSession(id);
            }
        }, this.#options.timeoutCheckMs);
    }

    // TODO: Add file locking
    // TODO: Only pass in safe paths here!
    public async initSession(userId: string, totalBytes: number, fileNameReadable: string)
    {
        const sessionId = this.#options.sessionIdGenerator(userId, this);
        if (sessionId.includes(`/`) || sessionId.includes(`\\`)) throw panic(`Wt are you doing?????`);

        if (this.sessions[sessionId] !== undefined) throw panic(`Repeated session id at the same time is disallowed!`);

        const fileHandle = await this.#options.fs.openPromise(
            path.join(this.#options.tempFolderFullPath, sessionId),
            'a'
        );

        // TODO: Make errors for invalid input
        this.sessions[sessionId] =
        {
            committedBytes: 0,
            creationDate: Date.now(),
            lastSuccessfulCommitDate: null,
            totalBytes: totalBytes,
            userId: userId,
            fileNameReadable,

            // TODO: Validate unsafePath
            fileHandle: fileHandle,
            writeStream: fileHandle.createWriteStream()
        };

        return {
            sessionId: sessionId
        }
    }

    public async appendBytes(userId: string, sessionId: string, bytes: Buffer)
    {
        const session = this.sessions[sessionId];
        if (!session) return new AppendBytesSessionNotFoundError(sessionId);
        if (session.userId !== userId) return new AppendBytesUserMismatchError(session.userId, userId);
        if (session.totalBytes - session.committedBytes < bytes.length)
            return new AppendBytesOutOfBoundError(bytes.length, session.totalBytes - session.committedBytes, 0, userId);

        let ioErr: null | unknown = null;
        if (bytes.length > 0)
        {
            await new Promise<void>((resolve, reject) =>
            {
                session.writeStream.write(bytes, err =>
                {
                    if (!!err) { ioErr = err; reject(); }
                    else resolve();
                });
            });
            session.committedBytes += bytes.length;
        }

        console.log(`${session.committedBytes} - ${session.totalBytes}`);
        if (ioErr !== null) { return new AppendBytesWriteBufferIOError(sessionId, ioErr) }
        else if (session.committedBytes === session.totalBytes) return "FINISHED" as const;
        else return "NEXT_CHUNK_READY"  as const;
    }

    /**
     * Move files that are finished uploading to the files storage.
     * This will remove the session automatically if the move is successful.
     */
    public async commitFile(sessionId: string, fileId: string): Promise<AppendBytesCommitFileIOError<unknown> | "OK">
    {
        return await new Promise<AppendBytesCommitFileIOError<unknown> | "OK">(resolve =>
        {
            this.#options.fs.rename(
                path.join(this.#options.tempFolderFullPath, sessionId),
                path.join(this.#options.filesFolderFullPath, fileId),
                async err =>
                {
                    if (err) return resolve(new AppendBytesCommitFileIOError(sessionId, err));
                    await this.removeSession(sessionId);
                    resolve("OK");
                }
            );
        });
    }

    public getSession(sessionId: string)
    {
        return this.sessions[sessionId];
    }

    public getSessionsOfUser(userId: string)
    {
        const output = [];
        for (const [id, session] of Object.entries(this.sessions))
        {
            if (session.userId === userId)
                output.push(
                {
                    committedBytes: session.committedBytes,
                    totalBytes: session.totalBytes,
                    creationDate: session.creationDate,
                    lastSuccessfulChunkDate: session.lastSuccessfulCommitDate,
                    fileNameReadable: session.fileNameReadable,
                    sessionId: id
                });
        }
        return output;
    }

    private async removeSession(sessionId: string)
    {
        const session = this.sessions[sessionId]; // TODO
        if (!session) throw panic(`wtf are you doing here??? huuu`);
        session.writeStream.close();
        await session.fileHandle.close();
        delete this.sessions[sessionId];
    }
}