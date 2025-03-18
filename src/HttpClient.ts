import fetch, { Response } from 'node-fetch';

class HttpClient {
    private baseURL: string;
    private headers: Record<string, string>;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.headers = {
            'Content-Type': 'application/json',
        };
    }

    private async request<T>(method: string, url: string, data?: any): Promise<T> {

        const options: any = {
            method,
            headers: this.headers,
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response: Response = await fetch(`${this.baseURL}${url}`, options);
        return this.handleResponse<T>(response);
    }

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        return response.json() as Promise<T>;
    }

    async get<T>(url: string): Promise<T> {
        return this.request<T>('GET', url);
    }

    async post<T>(url: string, data: any): Promise<T> {
        return this.request<T>('POST', url, data);
    }

    async put<T>(url: string, data: any): Promise<T> {
        return this.request<T>('PUT', url, data);
    }

    async delete<T>(url: string): Promise<T> {
        return this.request<T>('DELETE', url);
    }

}

export default HttpClient;
