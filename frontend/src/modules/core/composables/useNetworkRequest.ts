import router from '@/router';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

import { ref, watchEffect, toValue, readonly } from 'vue';

export type NetworkQuery =
{
    url: string,
    query: Record<string, string>,
    method?: "PUT" | "POST" | "GET" | "DELETE" | "PATCH",
    body?: unknown,
    headers?: Record<string, string>,
    axiosOptions?: AxiosRequestConfig
};

function setCookie(cname:string, cvalue:string, exdays:number): void
{
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname: string): string
{
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++)
    {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}
function clearCookie(cname:string) { setCookie(cname, "", -1); }

type UseNetworkRequestInterface =
{
    autoResetOnUnauthorized?: boolean;
    includeAuthHeaders?: boolean;
    updateOnMount?: boolean;
};

export function useNetworkRequest<T>
(
    queryObj: NetworkQuery|string|undefined,
    config: UseNetworkRequestInterface | undefined
)
{
    const queryObjInner = ref(queryObj);
    const shouldAutoResetOnUnauthorized = config?.autoResetOnUnauthorized ?? false;
    const shouldIncludeAuthHeaders = config?.includeAuthHeaders ?? false;
    const updateOnMount = config?.updateOnMount ?? true;

    const isLoading = ref<boolean>(false);
    const lastSuccessfulData = ref<T | null>(null);
    const lastAxiosStatusCode = ref<number | null>(null);
    const lastAxiosResponse = ref<AxiosResponse<any,any> | null>(null);
    const error = ref<any>(null);

    const resetAuth = () =>
    {
        clearCookie("jwt");
        router.push("/login");
    };

    const get = async (queryObj:NetworkQuery|string, extraHeaders:Record<string,string> = {}, extraAxiosOptions: AxiosRequestConfig = {}) =>
    {
        const url = typeof queryObj === 'string' ? queryObj : `${queryObj.url}?${new URLSearchParams(queryObj.query).toString()}`;
        const config = { headers: { ...extraHeaders } };
        if (shouldIncludeAuthHeaders) config.headers["Authorization"] = getCookie("jwt");
        return axios.get(url, { ...config, ...extraAxiosOptions });
    };

    const del = async (queryObj:NetworkQuery|string, extraHeaders:Record<string,string> = {}, extraAxiosOptions: AxiosRequestConfig = {}) =>
    {
        const url = typeof queryObj === 'string' ? queryObj : `${queryObj.url}?${new URLSearchParams(queryObj.query).toString()}`;
        const config = { headers: { ...extraHeaders } };
        if (shouldIncludeAuthHeaders) config.headers["Authorization"] = getCookie("jwt");
        return axios.delete(url, { ...config, ...extraAxiosOptions });
    };

    const post = async (queryObj:NetworkQuery|string, extraHeaders:Record<string,string> = {}, extraAxiosOptions: AxiosRequestConfig = {}) =>
    {
        const body = typeof queryObj === 'string' ? queryObj : queryObj.body;
        const url = typeof queryObj === 'string' ? queryObj : `${queryObj.url}?${new URLSearchParams(queryObj.query).toString()}`;
        const config = { headers: { ...extraHeaders } };
        if (shouldIncludeAuthHeaders) config.headers["Authorization"] = getCookie("jwt");
        return axios.post(url, body, { ...config, ...extraAxiosOptions });
    };

    const put = async (queryObj:NetworkQuery|string, extraHeaders:Record<string,string> = {}, extraAxiosOptions: AxiosRequestConfig = {}) =>
    {
        const body = typeof queryObj === 'string' ? queryObj : queryObj.body;
        const url = typeof queryObj === 'string' ? queryObj : `${queryObj.url}?${new URLSearchParams(queryObj.query).toString()}`;
        const config = { headers: { ...extraHeaders } };
        if (shouldIncludeAuthHeaders) config.headers["Authorization"] = getCookie("jwt");
        return axios.put(url, body, { ...config, ...extraAxiosOptions });
    };

    const patch = async (queryObj:NetworkQuery|string, extraHeaders:Record<string,string> = {}, extraAxiosOptions: AxiosRequestConfig = {}) =>
    {
        const body = typeof queryObj === 'string' ? queryObj : queryObj.body;
        const url = typeof queryObj === 'string' ? queryObj : `${queryObj.url}?${new URLSearchParams(queryObj.query).toString()}`;
        const config = { headers: { ...extraHeaders } };
        if (shouldIncludeAuthHeaders) config.headers["Authorization"] = getCookie("jwt");
        return axios.patch(url, body, { ...config, ...extraAxiosOptions });
    };

    const updateData: () => Promise<undefined|T> = async () =>
    {
        const queryMethod = typeof queryObj === 'string' ? 'GET' : queryObj?.method ?? 'GET';

        isLoading.value = true;
        error.value = null;

        if (!queryObjInner.value) return Promise.resolve(undefined);

        try
        {
            const methodToUse = (() =>
            {
                if (queryMethod === 'DELETE') return del;
                if (queryMethod === 'GET') return get;
                else if (queryMethod === 'PATCH') return patch;
                else if (queryMethod === 'POST') return post;
                else return put;
            })();
            let response = await methodToUse
            (
                toValue(queryObjInner.value),
                (() =>
                {
                    const inner = toValue(queryObjInner.value);
                    if (typeof inner === 'string') return {};
                    else return inner.headers ?? {};
                })(),
                (() =>
                {
                    const inner = toValue(queryObjInner.value);
                    if (typeof inner === 'string') return {};
                    else return inner.axiosOptions ?? {};
                })(),
            );

            lastAxiosResponse.value = response;
            lastAxiosStatusCode.value = response.status;
            lastSuccessfulData.value = response.data;
            await Promise.resolve<T>(lastSuccessfulData.value as T);
            isLoading.value = false;
        }
        catch(err)
        {
            if (axios.isAxiosError(err))
            {
                error.value = (() =>
                {
                    if (err.response?.data?.msg) return err.response.data.msg;
                    return err.response?.data;
                })();
                if (err.response?.status === 401 && shouldAutoResetOnUnauthorized)
                    resetAuth();
            }
            else error.value = err;
            Promise.resolve(undefined);
            isLoading.value = false;
        }
    };

    if (updateOnMount)
        watchEffect(() => { updateData(); });

    return {
        isLoading,
        lastSuccessfulData,
        lastAxiosStatusCode,
        error,
        updateData,
        resetAuth,
        setQueryObj: (query: NetworkQuery|string) => queryObjInner.value = query,
        queryObj: readonly(queryObjInner),
        lastAxiosResponse
    }
}