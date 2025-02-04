import { Request, Response } from "express"
import { BaseResource } from "./base"
import { Album, Track, Links, ApiResponse, ApiError } from "../types"
import db from "../database"

export class AlbumResource extends BaseResource {
  constructor() {
    super("albums", "albums")
    this.router.delete("/:id", this.deleteAlbum.bind(this))
    this.router.get("/:id/tracks", this.getAlbumTracks.bind(this))
    this.router.post("/:id/tracks", this.addTrack.bind(this))
  }

  protected async validateCreate(req: Request): Promise<void> {
    const { name, yearReleased, genre } = req.body
    const errors: string[] = []
    if (!name?.trim()) {
      errors.push("Name is required")
    }
    if (!yearReleased) {
      errors.push("Year released is required")
    } else if (
      typeof yearReleased !== "number" ||
      yearReleased < 1900 ||
      yearReleased > new Date().getFullYear()
    ) {
      errors.push("Invalid year released")
    }
    if (!genre?.trim()) {
      errors.push("Genre is required")
    }

    if (errors.length > 0) {
      const error = new Error(errors.join(", ")) as ApiError
      error.statusCode = 400
      throw error
    }
  }

  protected async performCreate(req: Request): Promise<Album> {
    const { name, yearReleased, genre } = req.body
    const result = await db.run(
      `INSERT INTO albums (name, yearReleased, genre)
             VALUES (?, ?, ?)`,
      [name.trim(), yearReleased, genre.trim()]
    )
    return {
      id: result.lastID,
      name: name.trim(),
      yearReleased,
      genre: genre.trim(),
    }
  }

  protected async deleteAlbum(req: Request, res: Response): Promise<void> {
    try {
      await db.run("BEGIN TRANSACTION")
      await db.run("DELETE FROM tracks WHERE albumId = ?", [req.params.id])

      // Delete the album
      const result = await db.run("DELETE FROM albums WHERE id = ?", [
        req.params.id,
      ])

      if (result.changes === 0) {
        await db.run("ROLLBACK")
        const response: ApiResponse<null> = {
          error: "Album not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      await db.run("COMMIT")
      res.status(204).send()
    } catch (error) {
      await db.run("ROLLBACK")
      this.handleError(error, res)
    }
  }

  protected async getAlbumTracks(req: Request, res: Response): Promise<void> {
    try {
      // First verify album exists
      const album = await db.get("SELECT id FROM albums WHERE id = ?", [
        req.params.id,
      ])

      if (!album) {
        const response: ApiResponse<null> = {
          error: "Album not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      const tracks: Track[] = await db.all(
        `SELECT * FROM tracks 
                 WHERE albumId = ? 
                 ORDER BY trackNumber`,
        [req.params.id]
      )

      const response: ApiResponse<Track[]> = {
        data: tracks,
        links: this.generateTracksCollectionLinks(req, req.params.id),
      }

      res.json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  private async addTrack(req: Request, res: Response): Promise<void> {
    try {
      // First verify album exists
      const album = await db.get("SELECT id FROM albums WHERE id = ?", [
        req.params.id,
      ])

      if (!album) {
        const response: ApiResponse<null> = {
          error: "Album not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      await this.validateTrack(req)

      const { trackNumber, title, durationSeconds, primaryArtistId } = req.body

      const result = await db.run(
        `INSERT INTO tracks (trackNumber, title, durationSeconds, primaryArtistId, albumId)
                 VALUES (?, ?, ?, ?, ?)`,
        [
          trackNumber,
          title.trim(),
          durationSeconds,
          primaryArtistId,
          req.params.id,
        ]
      )

      const newTrack: Track = {
        id: result.lastID,
        trackNumber,
        title: title.trim(),
        durationSeconds,
        primaryArtistId,
        albumId: parseInt(req.params.id),
      }

      const response: ApiResponse<Track> = {
        data: newTrack,
        links: this.generateTrackLinks(req, newTrack),
      }

      res.status(201).json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  private async validateTrack(req: Request): Promise<void> {
    const { trackNumber, title, durationSeconds, primaryArtistId } = req.body
    const errors: string[] = []

    if (!trackNumber || typeof trackNumber !== "number" || trackNumber < 1) {
      errors.push("Valid track number is required")
    }
    if (!title?.trim()) {
      errors.push("Title is required")
    }
    if (
      !durationSeconds ||
      typeof durationSeconds !== "number" ||
      durationSeconds < 1
    ) {
      errors.push("Valid duration in seconds is required")
    }
    if (!primaryArtistId) {
      errors.push("Primary artist is required")
    } else {
      // Verify artist exists
      const artist = await db.get("SELECT id FROM artists WHERE id = ?", [
        primaryArtistId,
      ])
      if (!artist) {
        errors.push("Primary artist not found")
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors.join(", ")) as ApiError
      error.statusCode = 400
      throw error
    }
  }

  protected generateResourceLinks(req: Request, album: Album): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}`
    return {
      self: {
        href: `${baseUrl}/albums/${album.id}`,
        rel: "self",
      },
      tracks: {
        href: `${baseUrl}/albums/${album.id}/tracks`,
        rel: "tracks",
        method: "GET",
      },
      addTrack: {
        href: `${baseUrl}/albums/${album.id}/tracks`,
        rel: "create",
        method: "POST",
      },
      delete: {
        href: `${baseUrl}/albums/${album.id}`,
        rel: "delete",
        method: "DELETE",
      },
      collection: {
        href: `${baseUrl}/albums`,
        rel: "collection",
      },
    }
  }

  private generateTracksCollectionLinks(req: Request, albumId: string): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}`
    return {
      self: {
        href: `${baseUrl}/albums/${albumId}/tracks`,
        rel: "self",
      },
      album: {
        href: `${baseUrl}/albums/${albumId}`,
        rel: "album",
      },
      addTrack: {
        href: `${baseUrl}/albums/${albumId}/tracks`,
        rel: "create",
        method: "POST",
      },
    }
  }

  private generateTrackLinks(req: Request, track: Track): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}`
    return {
      self: {
        href: `${baseUrl}/tracks/${track.id}`,
        rel: "self",
      },
      album: {
        href: `${baseUrl}/albums/${track.albumId}`,
        rel: "album",
      },
      artist: {
        href: `${baseUrl}/artists/${track.primaryArtistId}`,
        rel: "artist",
      },
    }
  }
}
