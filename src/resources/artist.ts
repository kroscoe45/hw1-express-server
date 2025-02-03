import { Request } from "express"
import { BaseResource } from "./base"
import { Artist, Links, ValidationError } from "../types"
import db from "../database"

export class ArtistResource extends BaseResource<Artist> {
  constructor() {
    super("artists", "artists")
  }

  protected async validateCreate(req: Request): Promise<void> {
    const { name, biography, socialMediaLinks } = req.body
    const errors: string[] = []

    if (!name?.trim()) {
      errors.push("Name is required")
    }

    if (!biography?.trim()) {
      errors.push("Biography is required")
    }

    if (socialMediaLinks && typeof socialMediaLinks !== "object") {
      errors.push("Social media links must be provided as an object")
    }

    // Validate social media URLs if provided
    if (socialMediaLinks) {
      Object.entries(socialMediaLinks).forEach(([platform, url]) => {
        if (typeof url !== "string" || !url.startsWith("http")) {
          errors.push(`Invalid URL for ${platform}`)
        }
      })
    }

    if (errors.length > 0) {
      const error = new Error("Validation failed") as ValidationError
      error.statusCode = 400
      error.validationErrors = { artist: errors }
      throw error
    }
  }

  protected async performCreate(req: Request): Promise<Artist> {
    const { name, biography, socialMediaLinks } = req.body
    const now = new Date().toISOString()
    const etag = this.generateEtag()
    const socialMediaJson = JSON.stringify(socialMediaLinks || {})

    const result = await db.run(
      `INSERT INTO artists (name, biography, socialMedia, createdAt, updatedAt, etag)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), biography.trim(), socialMediaJson, now, now, etag]
    )

    return {
      id: result.lastID,
      name: name.trim(),
      biography: biography.trim(),
      socialMediaLinks: socialMediaLinks || {},
      createdAt: now,
      updatedAt: now,
      etag,
    }
  }

  protected generateResourceLinks(req: Request, artist: Artist): Links {
    const baseUrl = `${req.protocol}://${req.get("host")}`
    return {
      self: {
        href: `${baseUrl}/artists/${artist.id}`,
        rel: "self",
      },
      tracks: {
        href: `${baseUrl}/artists/${artist.id}/tracks`,
        rel: "tracks",
        method: "GET",
      },
      concerts: {
        href: `${baseUrl}/artists/${artist.id}/concerts`,
        rel: "concerts",
        method: "GET",
      },
      delete: {
        href: `${baseUrl}/artists/${artist.id}`,
        rel: "delete",
        method: "DELETE",
      },
      collection: {
        href: `${baseUrl}/artists`,
        rel: "collection",
      },
    }
  }
}
