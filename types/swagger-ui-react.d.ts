declare module 'swagger-ui-react' {
  import { ComponentType } from 'react'

  export interface SwaggerUIProps {
    spec?: object
    url?: string
    docExpansion?: 'list' | 'full' | 'none'
    defaultModelsExpandDepth?: number
    defaultModelExpandDepth?: number
    defaultModelRendering?: 'example' | 'model'
    displayOperationId?: boolean
    displayRequestDuration?: boolean
    filter?: boolean | string
    maxDisplayedTags?: number
    operationsSorter?: string | ((a: object, b: object) => number)
    showExtensions?: boolean
    showCommonExtensions?: boolean
    tagsSorter?: string | ((a: object, b: object) => number)
    onComplete?: (system: object) => void
    presets?: object[]
    plugins?: object[]
    supportedSubmitMethods?: string[]
    tryItOutEnabled?: boolean
    requestInterceptor?: (request: object) => object
    responseInterceptor?: (response: object) => object
    showMutatedRequest?: boolean
    deepLinking?: boolean
    persistAuthorization?: boolean
    layout?: string
    validatorUrl?: string | null
    withCredentials?: boolean
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>
  export default SwaggerUI
}
