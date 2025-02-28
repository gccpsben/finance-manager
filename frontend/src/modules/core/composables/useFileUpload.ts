import { readonly, ref, type MaybeRefOrGetter } from "vue";
import { useNetworkRequest } from "./useNetworkRequest";
import type { FilesInitSessionAPI, FilesAppendChunkAPI } from '../../../../../api-types/files.d.ts';
import { API_FILES_APPEND_CHUNK_PATH, API_FILES_INIT_SESSION_PATH } from "@/apiPaths";

export type FileUploadState = { type: "UNINITIALIZED" } |
{ type: "INITIALIZING_SESSION" } |
{ type: "SESSION_INITIALIZED", sessionId: string } |
{ type: "UPLOADING_CHUNK", startBytes: number, endBytes: number, sessionId: string } |
{ type: "LAST_CHUNK_UPLOADED", lastStartBytes: number, lastEndBytes: number, sessionId: string } |
{ type: "LAST_CHUNK_UPLOAD_ERROR", error: any, failedStartBytes: number, failedEndBytes: number, sessionId: string } |
{ type: "SESSION_INIT_ERROR", error: any } |
{ type: "FINISHED_UPLOAD", fileId: string } |
{ type: "USER_CANCELLED" } |
{ type: "PAUSED", sessionId: string };

/** We want each chunk to take this much time to upload. */
const targetMsForChunk = 100;
const minSizePerChunk = 128;
const maxSizePerChunk = 49_000_000;
// const targetMsForChunk = 100;
// const minSizePerChunk = 18;
// const maxSizePerChunk = 18;

export function useFileUpload(file: File)
{
    const lastChunkUploadTimeOrError = ref<number | "ERROR">(0);
    const chunkSize = ref(1024);
    const state = ref<FileUploadState>({ type: 'UNINITIALIZED' });

    function adjustChunkSize()
    {
        let nextChunkSize = chunkSize.value;

        if (lastChunkUploadTimeOrError.value === 'ERROR')
        {
            nextChunkSize /= 2;
            nextChunkSize = Math.round(nextChunkSize);
            chunkSize.value = nextChunkSize;
            return nextChunkSize;
        }

        if (lastChunkUploadTimeOrError.value > targetMsForChunk) nextChunkSize *= 0.8;
        else if (lastChunkUploadTimeOrError.value < targetMsForChunk) nextChunkSize *= 1.2;
        if (nextChunkSize < minSizePerChunk) nextChunkSize = minSizePerChunk;
        if (nextChunkSize > maxSizePerChunk) nextChunkSize = maxSizePerChunk;
        nextChunkSize = Math.round(nextChunkSize);
        chunkSize.value = nextChunkSize;
        return nextChunkSize;
    }

    async function initSession()
    {
        const networkRequest = useNetworkRequest<FilesInitSessionAPI.ResponseDTO>
        (
            {
                query: {},
                url: "",
                method: "POST"
            },
            {
                autoResetOnUnauthorized: true,
                includeAuthHeaders: true,
                updateOnMount: false
            }
        );

        networkRequest.setQueryObj(
        {
            body: { "readableName": file.name, "totalBytes": file.size } as FilesInitSessionAPI.RequestDTO,
            query: { },
            url: API_FILES_INIT_SESSION_PATH,
            method: "POST"
        });

        state.value = { type: "INITIALIZING_SESSION" };
        await networkRequest.updateData();

        if (networkRequest.error.value)
        {
            state.value =
            {
                type: "SESSION_INIT_ERROR",
                error: networkRequest.error.value
            };
            return;
        }

        (() =>
        {
            const f = async () =>
            {
                const startTime = Date.now();
                await advanceStep();
                const endTime = Date.now();
                lastChunkUploadTimeOrError.value = endTime - startTime;
                if (state.value.type === 'LAST_CHUNK_UPLOAD_ERROR')
                    lastChunkUploadTimeOrError.value = 'ERROR';
                console.log(adjustChunkSize());

                if (state.value.type === 'FINISHED_UPLOAD') return;
                await f();
            };

            f();
        })();

        state.value = { type: "SESSION_INITIALIZED", sessionId: networkRequest.lastSuccessfulData.value!.id };
        return;
    }

    async function advanceStep()
    {
        const uploadChunk = async (nextStartByteToUpload:number, nextEndByteToUpload: number, sessionId: string) =>
        {
            const networkRequest = useNetworkRequest<FilesAppendChunkAPI.ResponseDTO>
            (
                {
                    query: {},
                    url: "",
                    method: "POST"
                },
                {
                    autoResetOnUnauthorized: true,
                    includeAuthHeaders: true,
                    updateOnMount: false
                }
            );

            const chunk = file.slice(nextStartByteToUpload, nextEndByteToUpload);

            networkRequest.setQueryObj(
            {
                query: { "sessionId": sessionId } as FilesAppendChunkAPI.QueryDTO,
                body: chunk,
                url: API_FILES_APPEND_CHUNK_PATH,
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" }
            });

            state.value = { type: "UPLOADING_CHUNK", endBytes: nextEndByteToUpload, sessionId: sessionId, startBytes: nextStartByteToUpload };
            await networkRequest.updateData();

            if (networkRequest.error.value)
            {
                lastChunkUploadTimeOrError.value = 'ERROR';
                state.value = {
                    type: "LAST_CHUNK_UPLOAD_ERROR",
                    error: networkRequest.error.value,
                    failedEndBytes: nextEndByteToUpload,
                    failedStartBytes: nextStartByteToUpload,
                    sessionId: sessionId
                };
                return;
            }

            const sessionState = networkRequest.lastSuccessfulData.value!.status;

            if (sessionState === 'FINISHED')
            {
                state.value = { type: "FINISHED_UPLOAD", fileId: networkRequest.lastSuccessfulData.value!.fileIdCreated! };
            }
            else
            {
                state.value = { type: "LAST_CHUNK_UPLOADED", lastEndBytes: nextEndByteToUpload, lastStartBytes: nextStartByteToUpload, sessionId: sessionId };
            }
        };

        const stateType = state.value.type;
        if (stateType === 'UNINITIALIZED')
        {
            await initSession();
            return;
        }
        else if (stateType === 'INITIALIZING_SESSION') { return; }
        else if (stateType === 'SESSION_INITIALIZED' || stateType === 'LAST_CHUNK_UPLOADED')
        {
            const sessionId = state.value.sessionId;
            const nextStartByteToUpload = stateType === 'LAST_CHUNK_UPLOADED' ? (state.value.lastEndBytes) : 0;
            let nextEndByteToUpload = stateType === 'LAST_CHUNK_UPLOADED' ? (state.value.lastEndBytes + chunkSize.value) : chunkSize.value;
            if (nextEndByteToUpload >= file.size) { nextEndByteToUpload = file.size; }
            await uploadChunk(nextStartByteToUpload, nextEndByteToUpload, sessionId);
        }
        else if (stateType === 'LAST_CHUNK_UPLOAD_ERROR')
        {
            chunkSize.value = minSizePerChunk;
            const sessionId = state.value.sessionId;
            const nextStartByteToUpload = state.value.failedStartBytes;
            let nextEndByteToUpload = state.value.failedStartBytes + chunkSize.value;
            if (nextEndByteToUpload >= file.size) { nextEndByteToUpload = file.size; }
            console.log(`Uploading ${nextStartByteToUpload} - ${nextEndByteToUpload}`);
            await uploadChunk(nextStartByteToUpload, nextEndByteToUpload, sessionId);
        }
    }

    initSession();

    return {
        state: readonly(state),
        getFileTotalBytes: () => file.size,
        file: readonly(file)
    }
}