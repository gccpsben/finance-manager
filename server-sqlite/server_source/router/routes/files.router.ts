import { TypesafeRouter } from "../typescriptRouter.ts";
import express from 'express';
import type { GetServerFilesByIdAPI, FilesAppendChunkAPI, FilesInitSessionAPI, GetOngoingFileSessionsAPI, GetServerFilesAPI } from '../../../../api-types/files.d.ts';
import { IsInt, IsNotEmpty, IsString } from "class-validator";
import { ExpressValidations } from "../validation.ts";
import { AccessTokenService, InvalidLoginTokenError } from "../../db/services/accessToken.service.ts";
import createHttpError from "http-errors";
import { Database } from "../../db/db.ts";
import { FilesService } from "../../db/services/files.service.ts";
import { UserNotFoundError } from "../../db/services/user.service.ts";
import { AppendBytesCommitFileIOError, AppendBytesOutOfBoundError, AppendBytesSessionNotFoundError, AppendBytesUserMismatchError, AppendBytesWriteBufferIOError } from "../../io/fileReceiver.ts";
import path from "node:path";
import { Buffer } from "node:buffer";

const router = new TypesafeRouter(express.Router());

router.get<GetServerFilesAPI.ResponseDTO>("/api/v1/files",
{
    handler: async (req: express.Request, _res: express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        return {
            // TODO: dont ref repo directly
            files: (await Database.getFileRepository()!.getUserFiles(authResult.ownerUserId)).map(x => ({
                id: x.id,
                readableName: x.fileNameReadable
            }))
        }
    }
});

router.post<GetOngoingFileSessionsAPI.ResponseDTO>("/api/v1/files/sessions",
{
    handler: async (req:express.Request, _res:express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        const sessions = Database.getFileReceiver()!
        .getSessionsOfUser(authResult.ownerUserId)
        .map(x => (
        {
            committedBytes: x.committedBytes,
            fileNameReadable: x.fileNameReadable,
            lastSuccessfulChunkDate: x.lastSuccessfulChunkDate,
            sessionId: x.sessionId,
            totalBytes: x.totalBytes
        }));

        return {
            sessions: sessions
        };
    }
});

router.post<FilesInitSessionAPI.ResponseDTO>("/api/v1/files/init",
{
    handler: async (req:express.Request, _res:express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class body implements FilesInitSessionAPI.RequestDTO
        {
            @IsString() @IsNotEmpty() readableName!: string;
            @IsInt() @IsNotEmpty() totalBytes!: number;
        };

        const parsedBody = await ExpressValidations.validateBodyAgainstModel<body>(body, req.body);
        const initializedSessionId = await Database.getFileReceiver()!.initSession
        (
            authResult.ownerUserId,
            parsedBody.totalBytes,
            parsedBody.readableName
        );

        return {
            id: initializedSessionId.sessionId
        };
    }
});

router.postBinary<FilesAppendChunkAPI.ResponseDTO>(`/api/v1/files/append`,
{
    handler: async (req:express.Request, _res:express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query implements FilesAppendChunkAPI.QueryDTO { @IsString() sessionId!: string }
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);

        const appendBytesResult = await FilesService.appendBytes(
            authResult.ownerUserId,
            parsedQuery.sessionId,
            (req.body === null || req.body === undefined) ? Buffer.from('') : Buffer.from(req.body)
        );

        console.log(JSON.stringify(appendBytesResult));

        if (appendBytesResult instanceof UserNotFoundError) throw createHttpError(401);
        if (appendBytesResult instanceof AppendBytesUserMismatchError) throw createHttpError(401);
        if (appendBytesResult instanceof AppendBytesSessionNotFoundError) throw createHttpError(404, appendBytesResult.message);
        if (appendBytesResult instanceof AppendBytesOutOfBoundError) throw createHttpError(400, appendBytesResult.message);
        if (appendBytesResult instanceof AppendBytesWriteBufferIOError) throw appendBytesResult;  // trigger 500
        if (appendBytesResult instanceof AppendBytesCommitFileIOError) throw appendBytesResult; // trigger 500

        return {
            status: appendBytesResult.state,
            fileIdCreated: appendBytesResult.fileIdCreated
        };
    }
});

router.custom<object>(`/api/v1/files/view`,
{
    handler: async (req, res) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query { @IsString() id!: string }
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);

        const dbFiles = await Database.getFileRepository()!.getUserFiles(authResult.ownerUserId);
        const dbFile = dbFiles.find(d => d.id === parsedQuery.id);
        if (!dbFile || !Database.getFilesStoragePath()) throw createHttpError(404);

        console.log(dbFile.fileNameReadable);
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURI(dbFile.fileNameReadable)}"`);
        res.sendFile(path.join(Database.getFilesStoragePath()!, dbFile.id));
        return {};
    }
});

router.get<GetServerFilesByIdAPI.ResponseDTO>(`/api/v1/files/id`,
{
    handler: async (req:express.Request, _res:express.Response) =>
    {
        const now = Date.now();
        const authResult = await AccessTokenService.validateRequestTokenValidated(req, now);
        if (authResult instanceof InvalidLoginTokenError) throw createHttpError(401);

        class query implements GetServerFilesByIdAPI.QueryDTO { @IsString() id!: string }
        const parsedQuery = await ExpressValidations.validateBodyAgainstModel<query>(query, req.query);
        console.log(parsedQuery.id);

        const dbFiles = await Database.getFileRepository()!.getUserFiles(authResult.ownerUserId);
        const dbFile = dbFiles.find(d => d.id === parsedQuery.id);

        if (!dbFile) throw createHttpError(404);

        return {
            id: parsedQuery.id,
            readableName: dbFile.fileNameReadable
        };
    }
});

export default router.getRouter();