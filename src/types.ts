export interface Link {
  href: string
  rel: string
  method?: string
  templated?: boolean
}

export interface Links {
  [key: string]: Link
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  links: Links
}

export interface ValidationError extends Error {
  statusCode: number
}

export interface DbResult {
  changes: number
  lastID: number
}
