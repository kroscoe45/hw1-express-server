export interface DbResult {
  lastID: number
  changes: number
}

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  order?: "asc" | "desc"
}
