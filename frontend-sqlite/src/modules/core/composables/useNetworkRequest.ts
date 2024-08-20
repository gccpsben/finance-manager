import router from '@/router';
import axios from 'axios';
import { ref, watchEffect, toValue } from 'vue';

export type NetworkQuery = 
{
    url: string,
    query: Record<string, string>
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

type UseNetworkRequestInterface = {
    autoResetOnUnauthorized?: boolean;
    includeAuthHeaders?: boolean;
    updateOnMount?: boolean;
};

export function useNetworkRequest<T>(queryObj: NetworkQuery|string|undefined, config: UseNetworkRequestInterface | undefined)
{
    const queryObjInner = ref(queryObj);
    const shouldAutoResetOnUnauthorized = config?.autoResetOnUnauthorized ?? false;
    const shouldIncludeAuthHeaders = config?.includeAuthHeaders ?? false;
    const updateOnMount = config?.updateOnMount ?? true;

    const isLoading = ref<boolean>(false);
    const lastSuccessfulData = ref<T | null>(null);
    const lastAxiosStatusCode = ref<number | null>(null);
    const error = ref<any>(null);

    const resetAuth = () =>
    {
        clearCookie("jwt");
        router.push("/login");
    };

    const authGet = async (queryObj:NetworkQuery|string, extraHeaders:Record<string,string> = {}) =>
    {
        const url = typeof queryObj === 'string' ? queryObj : `${queryObj.url}?${new URLSearchParams(queryObj.query).toString()}`;
        let headers = { headers: { ...extraHeaders } };
        if (shouldIncludeAuthHeaders) headers.headers["Authorization"] = getCookie("jwt");
        return axios.get(url, headers);
    };

    const updateData: () => Promise<undefined|T> = async () => 
    {
        isLoading.value = true;
        error.value = null;

        if (!queryObjInner.value) return Promise.resolve(undefined);

        try 
        {
            let response = await authGet(toValue(queryObjInner.value), { });
            lastAxiosStatusCode.value = response.status;
            lastSuccessfulData.value = response.data;
            Promise.resolve<T>(lastSuccessfulData.value as T);
            isLoading.value = false;
        }
        catch(err) 
        { 
            if (axios.isAxiosError(err))
            {
                error.value = err.response?.statusText;
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
        setQueryObj: (query: NetworkQuery|string) => queryObjInner.value = query
    }
}