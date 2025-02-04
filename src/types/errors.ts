export interface ValidationError extends Error {
    statusCode: number
    validationErrors?: Record<string, string[]>
  }