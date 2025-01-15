export namespace FilesInitSessionAPI
{
    export type RequestDTO =
    {
        readableName: string,
        totalBytes: number
    };
    export type ResponseDTO = { id: string; };
}

export namespace FilesAppendChunkAPI
{
    export type FilesAppendChunkStatuses = "NEXT_CHUNK_READY" | "FINISHED";

    export type QueryDTO = { sessionId: string };
    export type ResponseDTO = {
        status: FilesAppendChunkStatuses,
        fileIdCreated: string | null
    };
}

export namespace GetOngoingFileSessionsAPI
{
    export type RequestDTO = {};
    export type ResponseDTO =
    {
        sessions: {
            sessionId: string,
            fileNameReadable: string,
            totalBytes: number,
            committedBytes: number,
            lastSuccessfulChunkDate: number | null
        }[]
    };
}

export namespace GetServerFilesAPI
{
    export type FileDTO =
    {
        id: string,
        readableName: string,
    };

    export type ResponseDTO =
    {
        files: FileDTO[];
    };
}

export namespace GetServerFilesByIdAPI
{
    export type QueryDTO =
    {
        id: string
    };

    export type ResponseDTO =
    {
        id: string,
        readableName: string,
    };
}