import { Router, Request, Response } from "express";
const router = Router();
import db from "../database";

router.get("/by-id/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    res.status(400).send("Invalid or missing artist ID");
    return;
  }
  const query = `SELECT * FROM artists WHERE id = ?`;
  db.all(query, id, (err, rows) => {
    if (err) {
      res.status(500).send("Error retrieving artist");
      return;
    }
    res.status(200).send(rows);
  });
});

router.get("/", (req: Request, res: Response) => {
  db.all("SELECT * FROM artists", (err, rows) => {
    if (err) {
      res.status(500).send("Error retrieving artists");
      return;
    }
    res.status(200).send(rows);
  });
});

router.post("/", (req: Request, res: Response) => {
  const { name, bio, socials } = req.body;
  if (!name || !bio || !socials) {
    res.status(400).send("Missing required fields");
    return;
  }
  const serializedSocials = JSON.stringify(socials);
  db.serialize(() => {
    db.run(
      "INSERT INTO artists (name, bio, socials) VALUES (?, ?, ?)",
      [name, bio, serializedSocials],
      function (err) {
        if (err) {
          console.error("Error inserting artist:", err);
          res.status(500).send("Error inserting artist");
          return;
        }
        res
          .status(201)
          .send({ id: this.lastID, name, bio, socials: serializedSocials });
      }
    );
  });
});

router.patch("/by-id/:id", (req: Request, res: Response) => {
  const { name, bio, socials } = req.body;
  const id = req.params.id;
  if (!id || isNaN(parseInt(id))) {
    res.status(400).send("Invalid or missing artist ID");
    return;
  }
  if (!name && !bio && !socials) {
    res.status(400).send("Missing required fields");
    return;
  }
  console.log("PATCH /artists/by-id/:id", { id, name, bio, socials });
  const query = `UPDATE artists SET ${name ? `name = ?` : ""}${
    name && (bio || socials) ? `, ` : ""
  }${bio ? `bio = ?` : ""}${(name || bio) && socials ? `, ` : ""}${
    socials ? `socials = ?` : ""
  } WHERE id = ?`;
  const params = [name, bio, JSON.stringify(socials), id].filter(
    (param) => param !== undefined
  );
  db.serialize(() => {
    db.run(query, params, function (err) {
      if (err) {
        console.error("Error updating artist:", err);
        res.status(500).send("Error updating artist");
        return;
      }
      if (this.changes === 0) {
        res.status(404).send("Artist not found");
      } else {
        res.status(200).send("Artist updated successfully");
      }
    });
  });
});

export default router;
