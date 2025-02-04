export interface Link {
  href: string
  rel: string
  method?: "GET" | "POST" | "PUT" | "DELETE"
}

export interface Links {
  [key: string]: Link
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  links: Links
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface TimeRange {
  start: string
  end: string
}

export enum ConcertArtistRole {
  PRIMARY = "primary",
  SUPPORT = "support",
  OPENING_ACT = "opening_act",
}

export interface ConcertArtist {
  concertId: number
  artistId: number
  role: ConcertArtistRole
  artistName?: string
}
