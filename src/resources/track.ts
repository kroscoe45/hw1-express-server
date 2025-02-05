import { Request, Response } from "express"
import { BaseResource } from "./base"
import { Track, Links, ApiResponse, ApiError } from "../types"

import db from "../database"

export class TrackResource extends BaseResource {
  constructor() {
    super("tracks", "tracks")
  }

  protected async validateCreate(req: Request): Promise<void> {
    const { trackNumber, title, durationSeconds, primaryArtistId, albumId } =
      req.body
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
      errors.push("Primary artist ID is required")
    }

    if (!albumId) {
      errors.push("Album ID is required")
    }

    // Verify artist exists
    if (primaryArtistId) {
      const artist = await db.get("SELECT id FROM artists WHERE id = ?", [
        primaryArtistId,
      ])
      if (!artist) {
        errors.push("Primary artist not found")
      }
    }

    // Verify album exists
    if (albumId) {
      const album = await db.get("SELECT id FROM albums WHERE id = ?", [
        albumId,
      ])
      if (!album) {
        errors.push("Album not found")
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors.join(", ")) as ApiError
      error.statusCode = 400
      throw error
    }
  }

  protected async performCreate(req: Request): Promise<Track> {
    const { trackNumber, title, durationSeconds, primaryArtistId, albumId } =
      req.body
    const now = new Date().toISOString()

    const result = await db.run(
      `INSERT INTO tracks (
        trackNumber, 
        title, 
        durationSeconds, 
        primaryArtistId, 
        albumId, 
        createdAt, 
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        trackNumber,
        title.trim(),
        durationSeconds,
        primaryArtistId,
        albumId,
        now,
        now,
      ]
    )

    return {
      id: result.lastID,
      trackNumber,
      title: title.trim(),
      durationSeconds,
      primaryArtistId,
      albumId,
    }
  }

  protected generateResourceLinks(req: Request, track: Track): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}`
    return {
      self: {
        href: `${baseUrl}/tracks/${track.id}`,
        rel: "self",
      },
      album: {
        href: `${baseUrl}/albums/${track.albumId}`,
        rel: "album",
        method: "GET",
      },
      artist: {
        href: `${baseUrl}/artists/${track.primaryArtistId}`,
        rel: "artist",
        method: "GET",
      },
      delete: {
        href: `${baseUrl}/tracks/${track.id}`,
        rel: "delete",
        method: "DELETE",
      },
      collection: {
        href: `${baseUrl}/tracks`,
        rel: "collection",
      },
    }
  }

  // Custom endpoint to get all tracks for a specific album
  public async getTracksByAlbum(req: Request, res: Response): Promise<void> {
    try {
      const albumId = Number(req.params.albumId)

      // Verify album exists
      const album = await db.get("SELECT id FROM albums WHERE id = ?", [
        albumId,
      ])

      if (!album) {
        const response: ApiResponse<null> = {
          error: "Album not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      // Get all tracks for the album
      const tracks = await db.all<Track>(
        "SELECT * FROM tracks WHERE albumId = ? ORDER BY trackNumber",
        [albumId]
      )

      const response: ApiResponse<Track[]> = {
        data: tracks,
        links: {
          ...this.generateCollectionLinks(req),
          album: {
            href: `${req.protocol}://${req.get("host")}/albums/${albumId}`,
            rel: "album",
            method: "GET",
          },
        },
      }

      res.status(200).json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // Override delete to handle album relationship
  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id)

      // Verify track exists
      const track = await db.get<Track>("SELECT * FROM tracks WHERE id = ?", [
        id,
      ])

      if (!track) {
        const response: ApiResponse<null> = {
          error: "Track not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      // Delete the track
      await db.run("DELETE FROM tracks WHERE id = ?", [id])

      // Send 204 No Content
      res.status(204).send()
    } catch (error) {
      this.handleError(error, res)
    }
  }
}
