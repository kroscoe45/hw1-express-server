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
  db.all<Album>(
    query,
    bodyData.map((f) => req.body[f]),
    (err, rows) => {
      if (!err && rows.length) {
        try {
          db.run(
            insertStmnt,
            bodyData.map((key) => req.body[key]),
            (err) => {
              if (!err) res.status(201)
              else res.status(500).send("Error creating album")
            }
          )
        } catch (error) {
          res.status(500).send("Error creating album")
        }
      } else {
        res.status(400).send("Invalid album data")
      }
    }
  )
})

router.delete("/:id", (req: Request, res: Response) => {
  const { id } = req.params
  if (+id) {
    db.serialize(() => {
      db.get(
        "SELECT * FROM albums WHERE id = ?",
        [id],
        (err: Error, row: any) => {
          if (!err) {
            if (row) {
              db.run(
                "DELETE FROM albums WHERE id = ?",
                id,
                function (err: Error) {
                  if (err) {
                    res.status(500).send("Error deleting album")
                  } else {
                    res.status(204).send("")
                  }
                }
              )
            } else {
              res.status(404).send("Album not found")
            }
          } else {
            res.status(500).send("Error retrieving album")
          }
        }
      )
    })
  } else {
    res.status(400).send("Invalid album ID")
  }
})

export { router as albumsRouter }
