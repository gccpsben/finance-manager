import router from '@/router/router';
import axios, { type AxiosResponse, type RawAxiosRequestHeaders } from 'axios';
import { ref, watchEffect, toValue } from 'vue';

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

export function useNetworkRequest<T>(url: string|undefined, config: UseNetworkRequestInterface | undefined)
{
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

    const authGet = async (url:string, extraHeaders:any={}) =>
    {
        let headers = { headers: { ...extraHeaders } };
        if (shouldIncludeAuthHeaders) headers.headers["Authorization"] = getCookie("jwt");
        return axios.get(url, headers);
    };

    const updateData: () => Promise<undefined|T> = async () => 
    {
        isLoading.value = true;
        error.value = null;

        if (!url) return Promise.resolve(undefined);

        try 
        {
            let response = await authGet(toValue(url), { });
            lastAxiosStatusCode.value = response.status;
            lastSuccessfulData.value = response.status === 200 ? response.data : undefined;
            Promise.resolve<T>(lastSuccessfulData.value as T);
            if (shouldAutoResetOnUnauthorized && response.status === 401) resetAuth();
            isLoading.value = false;
        }
        catch(e) 
        { 
            error.value = e; 
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
        updateData
    }
}