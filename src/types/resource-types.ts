import { ConcertArtist } from "./api-types"

export interface SocialMediaLinks {
  facebook?: string
  twitter?: string
  instagram?: string
  [key: string]: string | undefined
}

export interface Album {
  id?: number
  name: string
  yearReleased: number
  genre: string
}

export interface Track {
  id?: number
  trackNumber: number
  title: string
  durationSeconds: number
  primaryArtistId: number
  albumId: number
}

export interface Artist {
  id?: number
  name: string
  biography: string
  socialMediaLinks: SocialMediaLinks
}

export interface Concert {
  id?: number
  startTime: string
  durationMinutes: number
  artists?: ConcertArtist[]
}
