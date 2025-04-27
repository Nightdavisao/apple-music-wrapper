import crypto from 'crypto'

enum HTTPMethod {
    GET = "GET",
    HEAD = "HEAD",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    OPTIONS = "OPTIONS",
}

interface RequestBuilderRequest {
    httpMethod: HTTPMethod,
    lastFmMethod: string
    requestData: string | null
    urlParams: string
}

export class LastFMClient {
    apiKey: string
    apiSecret: string
    rootUrl: string
    
    constructor(apiKey: string, apiSecret: string) {
        this.apiKey = apiKey
        this.apiSecret = apiSecret
        this.rootUrl = "http://ws.audioscrobbler.com/2.0/"
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private validateLastFmResponse(response: { [key: string]: any }) {
        if (typeof response !== 'object') throw 'Response is not a JSON object'

        if (response['error']) throw `message=(${response['message']}), error=(${response['error']})`

        return response
    }

    async validateAuthToken(token: string) {
        return this.request('auth.getSession', { token }, false, true)
    }
    
    async requestAuthToken() {
        return this.request('auth.getToken', {}, true, true)
    }
    
    private calcParamsHash(params: Record<string, string>) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { callback, format, ...newParams } = params
        let formattedString = ''
        for (const key of Object.keys(newParams).sort()) {
            formattedString += key + newParams[key]
        }
        formattedString += this.apiSecret

        const hash = crypto.createHash('md5')
        hash.update(formattedString)
        return hash.digest('hex')
    }

    async request(method: string, params: Record<string, string>, isGet: boolean = false, isAuthenticatedCall: boolean = true) {
        const builtRequest = this.buildRequest({
            method,
            httpMethod: isGet ? HTTPMethod.GET : HTTPMethod.POST,
            additionalParams: params,
            isAuthenticatedCall,
            data: null
        })

        return this.validateLastFmResponse((await this.fetchRequest(builtRequest)).json())
    }

    async fetchRequest(builtRequest: RequestBuilderRequest) {
        console.log('fetchRequest', builtRequest)
        if (builtRequest.httpMethod === HTTPMethod.GET) {
            return fetch(this.rootUrl + '?' + builtRequest.urlParams, {
                method: builtRequest.httpMethod,
                body: builtRequest.requestData
            })
        } else {
            return fetch(this.rootUrl, {
                method: builtRequest.httpMethod,
                body: builtRequest.urlParams
            })
        }
    }

    buildRequest(options: {
        httpMethod: HTTPMethod,
        method: string
        additionalParams: Record<string, string> | null
        data: string | null,
        isAuthenticatedCall: boolean | null
    }): RequestBuilderRequest {
        const params = {
            'api_key': this.apiKey,
            'method': options.method,
            'format': 'json',
        } as Record<string, string>;

        const additionalParams = options.additionalParams
        if (additionalParams) {
            for (const key of Object.keys(additionalParams)) {
                params[key] = additionalParams[key]
            }
        }

        const urlParams = new URLSearchParams({ 
            ...(options.isAuthenticatedCall ? { 'api_sig': this.calcParamsHash(params) } : {}),
            ...params,
        }).toString()

        return {
            httpMethod: options.httpMethod,
            lastFmMethod: options.method,
            requestData: options.data,
            urlParams
        }
    }
}