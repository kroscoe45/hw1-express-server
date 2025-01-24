import express, { Request, Response } from "express";
const router = express.Router();
import sqlite3 from "sqlite3";
import db from "../database";

// Debug statement added
router.get("/", (_req: Request, res: Response) => {
  console.log("GET /albums");
  db.all("SELECT title FROM albums", (err: Error, rows: any[]) => {
    if (err) {
      console.error("Error retrieving albums:", err);
      res.status(500).send("Error retrieving albums");
      return;
    }
    res.status(200).send(rows);
  });
});

// Debug statement added
router.get("/by-id/:id", (req: Request, res: Response) => {
  console.log(`GET /albums/by-id/${req.params.id}`);
  const { id } = req.params;
  if (isNaN(parseInt(id))) {
    res.status(400).send("Invalid album ID");
    return;
  }
  const query = `SELECT * FROM albums WHERE id = ?`;
  db.all(query, id, (err: Error, rows: any[]) => {
    if (err) {
      console.error("Error retrieving album:", err);
      res.status(500).send("Error retrieving album");
      return;
    }
    res.status(200).send(rows);
  });
});

// Debug statement added
router.get("/by-title/:title", (req: Request, res: Response) => {
  console.log(`GET /albums/by-title/${req.params.title}`);
  const { title } = req.params;
  if (title?.length === 0) {
    res.status(400).send("Invalid or missing title");
    return;
  }
  const query = `SELECT * FROM albums WHERE title LIKE ?`;
  db.all(query, [`%${title}%`], (err: Error, rows: any[]) => {
    if (err) {
      console.error("Error searching for albums:", err);
      res.status(500).send("Error searching for albums");
      return;
    }
    if (rows.length === 0) {
      res.status(404).send("No albums found");
      return;
    }
    res.status(200).send(rows);
  });
});

// Debug statement added
router.post("/", (req: Request, res: Response) => {
  console.log("POST /albums");
  const { title, genre, releaseYear } = req.body;
  if (!title || !genre || !releaseYear) {
    res.status(400).send("Missing required fields");
    return;
  }
  const parsedReleaseYear = parseInt(releaseYear);
  db.run(
    "INSERT INTO albums (title, genre, releaseYear) VALUES (?, ?, ?)",
    [title, genre, parsedReleaseYear],
    function (this: sqlite3.RunResult, err: Error) {
      if (err) {
        console.error("Error creating album:", err);
        res.status(500).send("Error creating album");
        return;
      }
      res.status(201).json({ id: (this as any).lastID });
    }
  );
});

// Debug statement added
router.put("/:id", (req: Request, res: Response) => {
  console.log(`PUT /albums/${req.params.id}`);
  const { id } = req.params;
  const { title, genre, releaseYear } = req.body;
  if (!title || !genre || !releaseYear) {
    res.status(400).send("Missing required fields");
    return;
  }
  const parsedReleaseYear = parseInt(releaseYear);
  db.run(
    "UPDATE albums SET title = ?, genre = ?, releaseYear = ? WHERE id = ?",
    [title, genre, parsedReleaseYear, id],
    function (err) {
      if (err) {
        console.error("Error updating album:", err);
        res.status(500).send("Error updating album");
        return;
      }
      if ((this as any).changes === 0) {
        res.status(404).send("Album not found");
        return;
      }
      res.status(200).send("Album updated");
    }
  );
});

// Debug statement added
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
        res.status(200).send("Album deleted");
      });
    });
  });
});

export default router;
