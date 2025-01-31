import express, { Request, Response } from "express";
import sqlite3 from "sqlite3";
import db from "../database";

const router = express.Router();
const fields = ["id", "title", "genre", "releaseYear", "artist"];

router.get("/", (req: Request, res: Response) => {
  const filters = Object.keys(req.query).filter((key) => fields.includes(key));
  const query = filters.length
    ? `SELECT * FROM albums WHERE ${filters
        .map((key) => `${key} = ?`)
        .join(" AND ")}`
    : "SELECT * FROM albums";
  db.all(
    query,
    filters.map((key) => req.query[key]),
    (err: Error, rows: any[]) => {
      if (!err) {
        if (rows.length) res.status(200).send(rows);
        else res.status(404).send("No albums found");
      } else res.status(500).send(rows);
    }
  );
});

router.post("/", (req: Request, res: Response) => {
  const filters = fields.filter(f => f !== "id" && f in req.body);

}, []);
  const { title, genre, releaseYear, artist } = req.body;
  const query = `INSERT INTO albums (${fields.join(", ")}) VALUES (?, ?, ?, ?)`;
  if (title && genre && +releaseYear) {
    db.run(
      "INSERT INTO albums (title, genre, releaseYear, artist) VALUES (?, ?, ?, ?)",
      [title, genre, +releaseYear, artist],
      function (this: sqlite3.RunResult, err: Error) {
        if (err) {
          console.error("Error creating album:", err);
          res.status(500).send("Error creating album");
        }
        res.status(201).json({ id: (this as any).lastID });
      }
    );
  } else {
    res.status(400).send("Missing required fields");
  }
});

router.delete("/by-id/:id", (req: Request, res: Response) => {
  console.log(`DELETE /albums/by-id/${req.params.id}`);
  const { id } = req.params;
  if (isNaN(parseInt(id))) {
    res.status(400).send("Invalid album ID");
    return;
  }
  db.serialize(() => {
    db.get("SELECT * FROM albums WHERE id = ?", id, (err: Error, row: any) => {
      if (err) {
        console.error("Error retrieving album:", err);
        res.status(500).send("Error retrieving album");
        return;
      }
      if (!row) {
        res.status(404).send("Album not found");
        return;
      }
      db.run("DELETE FROM albums WHERE id = ?", id, function (err: Error) {
        if (err) {
          console.error("Error deleting album:", err);
          res.status(500).send("Error deleting album");
          return;
        }
        res.status(204).send("Album deleted");
      });
    });
  });
});

export { router as albumsRouter };
