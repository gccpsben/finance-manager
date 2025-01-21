import type { AxiosResponse } from "axios";

export function extractFileExtension(fileName: string): string | undefined
{
    const re = /(?:\.([^.]+))?$/;
    const result = re.exec(fileName);
    return (result ?? [])[1]?.toString();
}

export function downloadFileFromAxiosResponse(axiosResponse: AxiosResponse)
{
    // Function to fetch the file and open it in a new window
    async function openFileInNewWindow()
    {
        try
        {
            // Extract content-disposition header from Axios response headers
            const disHeader = axiosResponse.headers['content-disposition'] ?? '';
            const fileNameURLEncoded = (disHeader.match(/(?<=")(?:\\.|[^"\\])*(?=")/) ?? [])[0] ?? null;
            const fileNameDecoded = fileNameURLEncoded ? decodeURI(fileNameURLEncoded) : null;

            // Create a Blob from the Axios response data
            const blob = new Blob([axiosResponse.data], { type: axiosResponse.headers['content-type'] });
            const blobUrl = URL.createObjectURL(blob);

            let a = document.createElement("a");
            if (fileNameDecoded) a.download = fileNameDecoded;
            a.href = blobUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // TODO: Handle properly
        } catch (error) { console.error('Error fetching the file:', error); }
    }

    openFileInNewWindow();
}