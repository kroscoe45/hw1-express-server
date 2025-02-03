export interface Album {
  id?: number
  title: string
  genre: string
  releaseYear: number
}

export interface Artist {
  id?: number
  name: string
  biography: string
  socialMediaLinks: SocialMediaLinks
}

export interface Track {
  id?: number
  title: string
  albumId: number
  artistId: number
  durationSeconds: number
  trackNumber: number
}

export interface Concert {
  id?: number
  startTime: string
  duration: number
  primaryArtistId: number
  additionalArtistIds?: number[]
}

export interface SocialMediaLinks {
  facebook?: string
  twitter?: string
  instagram?: string
  [key: string]: string | undefined
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  links: {
    [key: string]: {
      href: string
      rel: string
      method?: string
      templated?: boolean
    }
  }
}
