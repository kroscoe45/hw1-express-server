/**
 * "hypermedia link" in RESTful APIs
 */
export interface Link {
  href: string
  rel: string
  method?: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS"
  templated?: boolean
}

/**
 * named links for HATEOAS
 */
export interface Links {
  self: Link
  [key: string]: Link
}

/**
 * Standard API response
 */
export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  links: Links
  meta?: MetaData
}

/**
 * Standardized error structure
 */
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

/**
 * Metadata for collections and pagination
 */
export interface MetaData {
  totalCount?: number
  pageSize?: number
  currentPage?: number
  totalPages?: number
  timestamp: string
}

/**
 * Query parameters for collection endpoints
 */
export interface CollectionParams {
  pageSize?: number
  page?: number
  sort?: string
  order?: "asc" | "desc"
  filter?: Record<string, string>
}

/**
 * Validation error response
 */
export interface ValidationError extends Error {
  statusCode: number
  validationErrors?: Record<string, string[]>
}

/**
 * Options for resource creation/update
 */
export interface ResourceOptions {
  generateEtag?: boolean
  validateLinks?: boolean
}

/**
 * HTTP headers required for ETag support
 */
export interface EtagHeaders {
  "If-Match"?: string
  "If-None-Match"?: string
}

/**
 * Cache control options
 */
export interface CacheOptions {
  maxAge?: number
  private?: boolean
  noCache?: boolean
  noStore?: boolean
  mustRevalidate?: boolean
}

/**
 * Search criteria for collection endpoints
 */
export interface SearchCriteria {
  query?: string
  fields?: string[]
  dateRange?: {
    start?: string
    end?: string
  }
}
