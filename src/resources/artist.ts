import { Request, Response } from "express"
import { BaseResource } from "./base"
import { Artist, Links, ApiResponse, ApiError } from "../types"
import db from "../database"

export class ArtistResource extends BaseResource {
  constructor() {
    super("artists", "artists")
    this.router.put("/:id", this.performUpdate.bind(this))
  }

  protected async validateCreate(req: Request): Promise<void> {
    const { name, biography, socialMediaLinks } = req.body
    const errors: string[] = []
    if (!name?.trim()) {
      errors.push("Name cannot be empty")
    }
    if (!biography?.trim()) {
      errors.push("Biography cannot be empty")
    }
    if (socialMediaLinks) {
      if (typeof socialMediaLinks !== "object") {
        errors.push("Social media links must be an object")
      } else {
        Object.entries(socialMediaLinks).forEach(([platform, url]) => {
          if (typeof url !== "string" || !url.startsWith("http")) {
            errors.push(`Invalid URL for ${platform}`)
          }
        })
      }
    }
    if (errors.length > 0) {
      const error = new Error(errors.join(", ")) as ApiError
      error.statusCode = 400
      throw error
    }
  }

  protected async performCreate(req: Request): Promise<Artist> {
    const { name, biography, socialMediaLinks } = req.body
    const result = await db.run(
      `INSERT INTO artists (name, biography, socialMediaLinks)
             VALUES (?, ?, ?)`,
      [name.trim(), biography.trim(), JSON.stringify(socialMediaLinks || {})]
    )
    return {
      id: result.lastID,
      name: name.trim(),
      biography: biography.trim(),
      socialMediaLinks: socialMediaLinks || {},
    }
  }

  private async validateUpdate(req: Request): Promise<void> {
    const { name, biography, socialMediaLinks } = req.body
    const errors: string[] = []
    if (Object.keys(req.body).length === 0) {
      errors.push("At least one field must be provided for update")
    }
    if (name !== undefined && !name.trim()) {
      errors.push("Name cannot be empty")
    }
    if (biography !== undefined && !biography.trim()) {
      errors.push("Biography cannot be empty")
    }
    if (socialMediaLinks !== undefined) {
      if (typeof socialMediaLinks !== "object") {
        errors.push("Social media links must be an object")
      } else {
        Object.entries(socialMediaLinks).forEach(([platform, url]) => {
          if (typeof url !== "string" || !url.startsWith("http")) {
            errors.push(`Invalid URL for ${platform}`)
          }
        })
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
      // verify exists in db
      const artist = await db.get("SELECT * FROM artists WHERE id = ?", [
        req.params.id,
      ])
      if (!artist) {
        const response: ApiResponse<null> = {
          error: "Artist not found",
          links: this.generateCollectionLinks(req),
        }
        res.status(404).json(response)
        return
      }

      await this.validateUpdate(req)
      const { name, biography, socialMediaLinks } = req.body
      const updates: any = {}
      const params: any[] = []

      if (name) {
        updates.name = name.trim()
        params.push(name.trim())
      }
      if (biography) {
        updates.biography = biography.trim()
        params.push(biography.trim())
      }
      if (socialMediaLinks) {
        updates.socialMediaLinks = JSON.stringify(socialMediaLinks)
        params.push(JSON.stringify(socialMediaLinks))
      }

      // Only update provided fields
      const setClauses = Object.keys(updates)
        .map((key) => `${key} = ?`)
        .join(", ")

      params.push(req.params.id)

      const result = await db.run(
        `UPDATE artists 
                 SET ${setClauses}
                 WHERE id = ?`,
        params
      )

      interface RawArtistFromDb {
        id: number
        name: string
        biography: string
        socialMediaLinks: string
      }

      const rawArtist: RawArtistFromDb = (await db.get(
        "SELECT * FROM artists WHERE id = ?",
        [req.params.id]
      )) as RawArtistFromDb

      const updatedArtist: Artist = {
        ...rawArtist,
        socialMediaLinks:
          typeof rawArtist.socialMediaLinks === "string"
            ? JSON.parse(rawArtist.socialMediaLinks)
            : rawArtist.socialMediaLinks,
      }

      const response: ApiResponse<Artist> = {
        data: {
          ...updatedArtist,
        },
        links: this.generateResourceLinks(req, updatedArtist),
      }

      res.json(response)
    } catch (error) {
      this.handleError(error, res)
    }
  }

  protected generateResourceLinks(req: Request, artist: Artist): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}`
    return {
      self: {
        href: `${baseUrl}/artists/${artist.id}`,
        rel: "self",
      },
      update: {
        href: `${baseUrl}/artists/${artist.id}`,
        rel: "update",
        method: "PUT",
      },
      tracks: {
        href: `${baseUrl}/artists/${artist.id}/tracks`,
        rel: "tracks",
        method: "GET",
      },
      collection: {
        href: `${baseUrl}/artists`,
        rel: "collection",
      },
    }
  }
}
