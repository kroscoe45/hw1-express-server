import { Router, Request, Response } from "express"
import db from "../database"

const router = Router()

const fields = ["id", "title", "artistID", "albumID", "pos", "duration"]

router.options("/", (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get("host")}/tracks`
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
      track: {
        href: `${baseUrl}/{id}`,
        rel: "item",
        method: "GET",
        templated: true,
      },
    },
    description: "This endpoint allows retrieving and creating tracks.",
  })
})

router.get("/", (req: Request, res: Response) => {
  try {
    const filters: string[] = fields.filter(
      (f) => f !== "duration" && f !== "pos" && f in Object.keys(req.query)
    )

    const WHERE = filters.length ? "WHERE" : ""
    const query = `SELECT * FROM tracks ${
      WHERE + filters.map((f) => `${f} = ?`).join(" AND ")
    }`
    db.all(
      query,
      filters.map((f) => req.query[f]),
      (err, rows) => {
        if (err) res.status(500).send("Error retrieving tracks")
        else if (rows.length) res.status(200).send(rows)
        else res.status(200).send([])
        return
      }
    )
  } catch (err) {
    res.status(500).send("Error retrieving tracks")
  }
})

router.post("/", (req: Request, res: Response) => {
  if (req.body?.title && req.body.title.length > 64) {
    res.status(400).send("Invalid title")
    return
  }
  const bodyData = fields.filter(
    (f) => f !== "id" && req.body.hasOwnProperty(f)
  )
  const ins = `INSERT INTO tracks (${bodyData.join(", ")}) VALUES (${bodyData
    .map(() => "?")
    .join(", ")})`
  const query = `SELECT * FROM tracks WHERE ${bodyData
    .map((f) => `${f} = ?`)
    .join(" AND ")}`
  try {
    db.all(
      query,
      bodyData.map((f) => req.body[f]),
      (err, rows) => {
        if (err) res.status(500).send("Error retrieving tracks")
        else if (rows.length) res.status(409).send("Track already exists")
        else {
          db.run(
            ins,
            bodyData.map((key) => req.body[key]),
            (err) => {
              if (!err) res.status(201)
              else res.status(500).send("Error creating track")
            }
          )
        }
      }
    )
  } catch (err) {
    res.status(500).send("Error creating track")
  }
})

export { router as tracksRouter }
