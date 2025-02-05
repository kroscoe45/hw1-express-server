import express, { Request, Response } from "express"
import sqlite3 from "sqlite3"
import db from "../database"

interface Album {
  id: number
  title: string
  genre: string
  releaseYear: number
  artist: string | null
}

const router = express.Router()
const fields = ["id", "title", "genre", "releaseYear", "artist"]

router.options("/", (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get("host")}/albums`

  res.set("Allow", "GET, POST, OPTIONS")
  res.status(200).json({
    methods: ["GET", "POST", "OPTIONS"],
    links: {
      self: {
        href: baseUrl,
        rel: "self",
      },
      create: {
        href: baseUrl,
        rel: "create",
        method: "POST",
      },
      album: {
        href: `${baseUrl}/{id}`,
        rel: "item",
        method: "GET",
        templated: true,
      },
    },
    description:
      "This endpoint allows retrieving and creating albums. Use `/albums/{id}` for individual albums.",
  })
})

router.options("/:id", (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get("host")}/albums/{id}${
    req.params.id
  }`
  res.set("Allow", "GET, DELETE, OPTIONS")
  res.status(200).json({
    methods: ["GET", "DELETE", "OPTIONS"],
    links: {
      self: {
        href: baseUrl,
        rel: "self",
      },
      delete: {
        href: baseUrl,
        rel: "delete", // cant find a relation in https://www.iana.org/assignments/link-relations/link-relations.xhtml except maybe "edit"
        method: "DELETE",
      },
    },
    description: `This endpoint allows deleting the album with ID ${req.params.id}.`,
  })
})

router.post("/", async (req: Request, res: Response) => {
  if (!req.body.title) {
    res.status(400).send("Missing required fields")
    return
  }
  const bodyData = fields.filter(
    (f) => f !== "id" && f in Object.keys(req.body)
  )
  const insertStmnt = `INSERT INTO albums (${bodyData.join(
    ", "
  )}) VALUES (${bodyData.map(() => "?").join(", ")})`
  const query = `SELECT * FROM albums WHERE ${bodyData
    .map((f) => `${f} = ?`)
    .join(" AND ")}`
  try {
    const rows = await db.all<Album>(
      query,
      bodyData.map((f) => req.body[f])
    )
    if (rows.length > 0) {
      res.status(400).send("Album already exists") 
      return
    }
    const result = await db.run(
      `INSERT INTO albums (${bodyData.join(", ")}) VALUES (${bodyData.map(() => "?").join(", ")})`,
      bodyData.map(key => req.body[key])
    )
    res.status(201).json({ id: result.lastID })
  } catch (error) {
    res.status(500).send("Error creating album")
  }
});

router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params
  if (+id) {
    try {
      const row = await db.get("SELECT * FROM albums WHERE id = ?", [id])
      if (row) {
        try {
          const trackDelete = await db.run("DELETE FROM tracks WHERE albumId = ?", [id])
          const result = await db.run("DELETE FROM albums WHERE id = ?",[id])
        
        } catch (error) {
          res.status(500).send("Error deleting album")
        }
      } else {
        res.status(404).send("Album not found")
      }    
      } catch (error) {
        res.status(500).send("Error deleting album")
      }           
        if (err) {
            res.status(500).send("Error deleting album")
          } else {
            res.status(204).send("")
          }
        }
      )

export { router as albumsRouter }
