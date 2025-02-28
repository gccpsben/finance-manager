import { API_FILE_BY_ID_PATH } from "@/apiPaths";
import { useNetworkRequest } from "./useNetworkRequest";
import type { GetServerFilesByIdAPI } from "../../../../../api-types/files";

export function useFileById(id: string)
{
    const networkRequest = useNetworkRequest<GetServerFilesByIdAPI.ResponseDTO>({
        query: { id: id },
        url: API_FILE_BY_ID_PATH,
        body: {},
        headers: {},
        method: "GET"
    },
    {
        autoResetOnUnauthorized: true,
        includeAuthHeaders: true,
        updateOnMount: true
    });

    return {
        networkRequest
    }
}