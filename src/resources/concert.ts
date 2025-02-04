import { Request, Response } from "express"
import { BaseResource } from "./base"
import {
  Concert,
  ConcertArtist,
  ConcertArtistRole,
  Links,
  ApiResponse,
  ApiError,
  TimeRange,
  Artist,
} from "../types"
import db from "../database"

export class ConcertResource extends BaseResource {
  constructor() {
    super("concerts", "concerts")
    // Add routes specific to concert resource
    this.router.put("/:id", this.performUpdate.bind(this))
    this.router.get("/byTimeRange", this.listByTimeRange.bind(this))
    this.router.post("/:id/artists", this.addArtistToConcert.bind(this))
    this.router.delete(
      "/:concertId/artists/:artistId",
      this.removeArtistFromConcert.bind(this)
    )
  }

  protected async validateCreate(req: Request): Promise<void> {
    const { startTime, durationMinutes, artists } = req.body
    const errors: string[] = []

    // Validate start time
    if (!startTime) {
      errors.push("Start time is required")
    } else {
      const parsedDate = new Date(startTime)
      if (isNaN(parsedDate.getTime())) {
        errors.push("Invalid start time format")
      }
    }

    if (
      !durationMinutes ||
      typeof durationMinutes !== "number" ||
      durationMinutes <= 0
    ) {
      errors.push("Duration must be a positive number")
    }

    if (artists) {
      if (!Array.isArray(artists)) {
        errors.push("Artists must be an array")
      } else {
        for (const artistEntry of artists) {
          if (
            !artistEntry.artistId ||
            typeof artistEntry.artistId !== "number"
          ) {
            errors.push("Each artist must have a valid artistId")
          }
          if (!Object.values(ConcertArtistRole).includes(artistEntry.role)) {
            errors.push(`Invalid artist role: ${artistEntry.role}`)
          }
        }
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors.join(", ")) as ApiError
      error.statusCode = 400
      throw error
    }
  }

  protected async performCreate(req: Request): Promise<Concert> {
    const { startTime, durationMinutes, artists } = req.body
    const concertResult = await db.run(
      `INSERT INTO concerts (startTime, durationMinutes) VALUES (?, ?)`,
      [startTime, durationMinutes]
    )
    const concertId = concertResult.lastID
    if (artists?.length > 0) {
      for (const artist of artists) {
        await db.run(
          `INSERT INTO concert_artists (concert_id, artist_id, role) VALUES (?, ?, ?)`,
          [concertId, artist.artistId, artist.role]
        )
      }
    }
    const fullConcert = await this.fetchConcertWithArtists(concertId)
    return fullConcert
  }

  private async fetchConcertWithArtists(concertId: number): Promise<Concert> {
    const concert: Concert = (await db.get(
      `SELECT * FROM concerts WHERE id = ?`,
      [concertId]
    )) as Concert

    // Fetch associated artists
    const artists: ConcertArtist[] = (await db.all(
      `SELECT ca.artist_id as artistId, a.name as artistName, ca.role 
             FROM concert_artists ca
             JOIN artists a ON ca.artist_id = a.id
             WHERE ca.concert_id = ?`,
      [concertId]
    )) as ConcertArtist[]

    return {
      ...concert,
      artists: artists,
    }
  }

  private async validateUpdate(req: Request): Promise<void> {
    const { startTime, durationMinutes } = req.body
    const errors: string[] = []

    if (Object.keys(req.body).length === 0) {
      errors.push("At least one field must be provided for update")
    }

    // Validate start time if provided
    if (startTime) {
      const parsedDate = new Date(startTime)
      if (isNaN(parsedDate.getTime())) {
        errors.push("Invalid start time format")
      }
    }

    // Validate duration if provided
    if (durationMinutes !== undefined) {
      if (typeof durationMinutes !== "number" || durationMinutes <= 0) {
        errors.push("Duration must be a positive number")
      }
    }

    if (errors.length > 0) {
      const error = new Error(errors.join(", ")) as ApiError
      error.statusCode = 400
      throw error
    }
  }

  private async performUpdate(req: Request, res: Response): Promise<void> {
    try {
      // First verify concert exists
      const concert = await db.get("SELECT * FROM concerts WHERE id = ?", [
        req.params.id,
      ])

      if (!concert) {
        const response: ApiResponse<null> = {
          error: "Concert not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      await this.validateUpdate(req)

      const { startTime, durationMinutes } = req.body
      const updates: any = {}
      const params: any[] = []

      if (startTime) {
        updates.startTime = startTime
        params.push(startTime)
      }
      if (durationMinutes !== undefined) {
        updates.durationMinutes = durationMinutes
        params.push(durationMinutes)
      }

      // Only update provided fields
      const setClauses = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ")

      params.push(req.params.id)

      await db.run(
        `UPDATE concerts 
                 SET ${setClauses}
                 WHERE id = ?`,
        params
      )

      // Get updated concert with artists
      const updatedConcert = await this.fetchConcertWithArtists(
        Number(req.params.id)
      )

      const response: ApiResponse<Concert> = {
        data: updatedConcert,
        links: this.generateResourceLinks(req, updatedConcert),
      }

      res.json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // New method to list concerts within a time range
  private async listByTimeRange(req: Request, res: Response): Promise<void> {
    try {
      const { start, end } = req.query as unknown as TimeRange

      if (!start || !end) {
        const response: ApiResponse<null> = {
          error: "Both start and end times are required",
          links: this.generateCollectionLinks(req),
        }
        res.status(400).json(response)
        return
      }

      const concerts: Concert[] = await db.all(
        "SELECT * FROM concerts WHERE startTime BETWEEN ? AND ?",
        [start, end]
      )

      const processedConcerts = await Promise.all(
        concerts.map(async (concert) => {
          const artists: ConcertArtist[] = await db.all(
            `SELECT ca.artist_id as artistId, a.name as artistName, ca.role 
                         FROM concert_artists ca
                         JOIN artists a ON ca.artist_id = a.id
                         WHERE ca.concert_id = ?`,
            [concert.id]
          )

          return {
            ...concert,
            artists,
          }
        })
      )

      const response: ApiResponse<Concert[]> = {
        data: processedConcerts,
        links: this.generateCollectionLinks(req),
      }

      res.json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // Add an artist to a concert
  private async addArtistToConcert(req: Request, res: Response): Promise<void> {
    try {
      const concertId = Number(req.params.id)
      const { artistId, role } = req.body

      // Validate input
      if (!artistId || !role) {
        const response: ApiResponse<null> = {
          error: "Artist ID and role are required",
          links: this.generateResourceLinks(req, updatedConcert),
        }
        res.status(400).json(response)
        return
      }

      // Verify concert exists
      const concert = await db.get("SELECT * FROM concerts WHERE id = ?", [
        concertId,
      ])

      if (!concert) {
        const response: ApiResponse<null> = {
          error: "Concert not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      // Verify artist exists
      const artist = await db.get("SELECT * FROM artists WHERE id = ?", [
        artistId,
      ])

      if (!artist) {
        const response: ApiResponse<null> = {
          error: "Artist not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      // Check if artist is already in the concert
      const existingArtist = await db.get(
        "SELECT * FROM concert_artists WHERE concert_id = ? AND artist_id = ?",
        [concertId, artistId]
      )

      if (existingArtist) {
        const response: ApiResponse<null> = {
          error: "Artist is already in this concert",
          links: this.generateResourceLinks(req, { id: concertId }),
        }
        res.status(400).json(response)
        return
      }

      // Add artist to concert
      await db.run(
        "INSERT INTO concert_artists (concert_id, artist_id, role) VALUES (?, ?, ?)",
        [concertId, artistId, role]
      )

      // Fetch updated concert details
      const updatedConcert = await this.fetchConcertWithArtists(concertId)

      const response: ApiResponse<Concert> = {
        data: updatedConcert,
        links: this.generateResourceLinks(req, updatedConcert),
      }

      res.status(201).json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  // Remove an artist from a concert
  private async removeArtistFromConcert(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const concertId = Number(req.params.concertId)
      const artistId = Number(req.params.artistId)

      // Verify concert exists
      const concert = await db.get("SELECT * FROM concerts WHERE id = ?", [
        concertId,
      ])

      if (!concert) {
        const response: ApiResponse<null> = {
          error: "Concert not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      // Remove artist from concert
      const result = await db.run(
        "DELETE FROM concert_artists WHERE concert_id = ? AND artist_id = ?",
        [concertId, artistId]
      )

      if (result.changes === 0) {
        const response: ApiResponse<null> = {
          error: "Artist not found in this concert",
          links: this.generateResourceLinks(req, { id: concertId }),
        }
        res.status(404).json(response)
        return
      }

      // Fetch updated concert details
      const updatedConcert = await this.fetchConcertWithArtists(concertId)

      const response: ApiResponse<Concert> = {
        data: updatedConcert,
        links: this.generateResourceLinks(req, updatedConcert),
      }

      res.json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  protected generateResourceLinks(req: Request, concert: Concert): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}`
    return {
      self: {
        href: `${baseUrl}/concerts/${concert.id}`,
        rel: "self",
      },
      update: {
        href: `${baseUrl}/concerts/${concert.id}`,
        rel: "update",
        method: "PUT",
      },
      addArtist: {
        href: `${baseUrl}/concerts/${concert.id}/artists`,
        rel: "addArtist",
        method: "POST",
      },
      artists: {
        href: `${baseUrl}/concerts/${concert.id}/artists`,
        rel: "artists",
        method: "GET",
      },
      collection: {
        href: `${baseUrl}/concerts`,
        rel: "collection",
      },
    }
  }
}
