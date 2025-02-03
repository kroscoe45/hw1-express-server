export interface BaseModel {
  id: number
  createdAt: string
  updatedAt: string
  etag: string
}

export interface Album extends BaseModel {
  title: string
  genre: string
  releaseYear: number
}

export interface Artist extends BaseModel {
  name: string
  biography: string
  socialMedia: Record<string, string>
}

export interface Track extends BaseModel {
  title: string
  trackNumber: number
  durationSeconds: number
  albumId: number
  artistId: number
}

export interface Concert extends BaseModel {
  startTime: string
  durationMinutes: number
  primaryArtistId: number
  guestArtistIds?: number[]
}
