import { Router, Request, Response } from "express";
import sqlite3 from "sqlite3";

const router = Router();
const db = new sqlite3.Database(":memory:");

router.get("/by-date/:startDate/:endDate", (req: Request, res: Response) => {
  const { startDate, endDate } = req.params;
  if (!startDate || !endDate) {
    res.status(400).send("Invalid or missing date range");
    return;
  }
  const query = `SELECT * FROM concerts WHERE start BETWEEN ? AND ?`;
  db.all(query, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).send("Error retrieving concerts");
      return;
    }
    res.status(200).send(rows);
  });
});

router.patch("/by-id/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    res.status(400).send("Invalid or missing concert ID");
    return;
  }
  const { name, startDate, durationMinutes } = req.body;
  if (!name && !startDate && !durationMinutes) {
    res.status(400).send("Missing required fields");
    return;
  }
  const query =
    "UPDATE concerts SET " +
    (name ? "name = ?" : "") +
    (name && (startDate || durationMinutes) ? `, ` : "") +
    (startDate ? `startDate = ?` : "") +
    ((name || startDate) && durationMinutes ? `, ` : "") +
    (durationMinutes ? `durationMinutes = ?` : "") +
    ` WHERE id = ?`;
  const params = [name, startDate, durationMinutes, id].filter(
    (param) => param !== undefined
  );
  db.serialize(() => {
    db.run(query, params, function (err) {
      if (err) {
        res.status(500).send("Error updating concert");
        return;
      }
      res.status(200).send({ id, name, startDate, durationMinutes });
    });
  });
});

export default router;
