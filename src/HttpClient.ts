import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse} from 'axios'

class HttpClient {
    private instance: AxiosInstance

    constructor(baseURL: string, timeout = 10000) {
        this.instance = axios.create({
            baseURL,
            timeout,
            headers: {'Content-Type': 'application/json'},
        })

        this.instance.interceptors.request.use(
            (config) => {
                return config
            },
            (error) => Promise.reject(error)
        )

        this.instance.interceptors.response.use(
            (response: AxiosResponse) => response.data,
            (error) => Promise.reject(error)
        )
    }

    get<T = any>(url: string, params?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.get(url, {params, ...config})
    }

    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.post(url, data, config)
    }

    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.put(url, data, config)
    }

    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
        return this.instance.delete(url, config)
    }
}

export default HttpClient
