declare module 'swagger-ui-react' {
  import { ComponentType } from 'react'

  interface SwaggerUIProps {
    spec?: object
    url?: string | null
    layout?: string
    docExpansion?: 'list' | 'full' | 'none'
    defaultModelsExpandDepth?: number
    defaultModelExpandDepth?: number
    displayOperationId?: boolean
    displayRequestDuration?: boolean
    filter?: boolean | string
    maxDisplayedTags?: number
    showExtensions?: boolean
    showCommonExtensions?: boolean
    supportedSubmitMethods?: string[]
    tryItOutEnabled?: boolean
    validatorUrl?: string | null
    requestInterceptor?: (request: any) => any
    responseInterceptor?: (response: any) => any
    onComplete?: (system: any) => void
    presets?: any[]
    plugins?: any[]
    [key: string]: any
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>
  export default SwaggerUI
}
