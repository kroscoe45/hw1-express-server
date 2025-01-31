import { Router, Request, Response } from "express";
import db from "../database";

const router = Router();

router.options("/", (req: Request, res: Response) => {
  res.header("Allow", "GET, POST");
  res.status(204);
});



router.get("/by-album/:albumID", (req: Request, res: Response) => {
  const { albumID } = req.params;
  if (!albumID || isNaN(parseInt(albumID))) {
    res.status(400).send("Invalid or missing album ID");
    return;
  }
  const query = `SELECT * FROM tracks WHERE albumID = ?`;
  db.all(query, albumID, (err, rows) => {
    if (err) {
      res.status(500).send("Error retrieving tracks");
      return;
    }
    res.status(200).send(rows);
  });
});

router.get("/by-id/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    res.status(400).send("Invalid or missing track ID");
    return;
  }
  const query = `SELECT * FROM tracks WHERE id = ?`;
  db.all(query, id, (err, rows) => {
    if (err) {
      res.status(500).send("Error retrieving track");
      return;
    }
    res.status(200).send(rows);
  });
});

router.post("/", (req: Request, res: Response) => {
  const { pos, title, duration, albumID, artistID } = req.body;
  if (!pos || !title || !duration || !artistID) {
    res.status(400).send("Missing required fields");
    return;
  }
  const parsedDuration = parseInt(duration);
  if (isNaN(parsedDuration)) {
    res.status(400).send("Invalid duration");
    return;
  }
  const parsedAlbumID = albumID ? parseInt(albumID) : null;
  const parsedArtistID = parseInt(artistID);
  if (isNaN(parsedArtistID)) {
    res.status(400).send("Invalid artist ID");
    return;
  }
  db.serialize(() => {
    db.run(
      "INSERT INTO tracks (pos, title, durationSeconds, albumID, artistID) VALUES (?, ?, ?, ?, ?)",
      [pos, title, parsedDuration, parsedAlbumID, parsedArtistID],
      function (err) {
        if (err) {
          console.error("Error inserting track:", err);
          res.status(500).send("Error inserting track");
          return;
        }
        res.status(201).send({
          id: this.lastID,
          pos,
          title,
          duration: parsedDuration,
          artistID: parsedArtistID,
          albumID: parsedAlbumID || null,
        });
      }
    );
  });
});

export {router as tracksRouter}
