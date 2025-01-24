const assert = require("assert");
const request = require("supertest");
const express = require("express");
const sqlite3 = require("sqlite3");

describe("Application Tests", () => {
  const app = express();
  app.use(express.json());

  const db = new sqlite3.Database(":memory:");
  const db_schema = {
    albums: [
      { id: "INTEGER PRIMARY KEY AUTOINCREMENT" },
      { title: "STRING" },
      { released: "DATE" },
      { numTracks: "INTEGER" },
    ],
    artists: [
      { id: "INTEGER PRIMARY KEY AUTOINCREMENT" },
      { name: "STRING" },
      { bio: "DATE" },
      { socials: "STRING" },
    ],
    tracks: [
      { id: "INTEGER PRIMARY KEY AUTOINCREMENT" },
      { title: "STRING" },
      { pos: "INTEGER" },
      { durationSeconds: "INTEGER" },
      { albumID: "INTEGER NULL REFERENCES albums(id)" },
      { artistID: "INTEGER NULL REFERENCES artists(id)" },
    ],
    concerts: [
      { id: "INTEGER PRIMARY KEY AUTOINCREMENT" },
      { name: "STRING" },
      { startDate: "DATETIME" },
      { durationMinutes: "INTEGER" },
      { headliner: "STRING" },
    ],
  };

  for (const table of Object.keys(db_schema)) {
    db.run(
      `CREATE TABLE IF NOT EXISTS ${table}(${db_schema[table]
        .map((col: { [key: string]: string }) => {
          return `${Object.keys(col)[0]} ${Object.values(col)[0]}`;
        })
        .join(", ")})`
    );
  }

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  app.get("/albums/by-id/:id", (req, res) => {
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      res.status(400).send("Invalid or missing album ID");
      return;
    }
    const query = `SELECT * FROM albums WHERE id = ?`;
    db.all(query, id, (err, rows) => {
      if (err) {
        res.status(500).send("Error retrieving album");
        return;
      }
      res.status(200).send(rows);
    });
  });

  app.get("/albums", (req, res) => {
    db.all("SELECT title FROM albums", (err, rows) => {
      if (err) {
        res.status(500).send("Error retrieving albums");
        return;
      }
      res.status(200).send(rows);
    });
  });

  describe("Basic Tests", () => {
    it("should return true for true", () => {
      assert.strictEqual(true, true);
    });

    it("should return 2 for 1 + 1", () => {
      assert.strictEqual(1 + 1, 2);
    });
  });

  describe("GET /", () => {
    it("should return Hello World", (done) => {
      request(app).get("/").expect(200).expect("Hello World!", done);
    });
  });

  describe("GET /albums/by-id/:id", () => {
    it("should return 400 for invalid album ID", (done) => {
      request(app)
        .get("/albums/by-id/invalid")
        .expect(400)
        .expect("Invalid or missing album ID", done);
    });

    it("should return 200 and an empty array for valid album ID", (done) => {
      request(app).get("/albums/by-id/1").expect(200).expect([], done);
    });
  });

  describe("GET /albums", () => {
    it("should return 200 and an empty array", (done) => {
      request(app).get("/albums").expect(200).expect([], done);
    });
  });

  describe("POST /albums", () => {
    it("should return 400 for missing fields", (done) => {
      request(app)
        .post("/albums")
        .send({})
        .expect(400)
        .expect("Missing required fields", done);
    });

    it("should return 201 for valid album", (done) => {
      request(app)
        .post("/albums")
        .send({ title: "Test Album", releaseYear: 2021, genre: "Rock" })
        .expect(201)
        .expect((res) => {
          assert.strictEqual(res.body.title, "Test Album");
          assert.strictEqual(res.body.releaseYear, 2021);
          assert.strictEqual(res.body.genre, "Rock");
        })
        .end(done);
    });
  });

  describe("POST /artists", () => {
    it("should return 400 for missing fields", (done) => {
      request(app)
        .post("/artists")
        .send({})
        .expect(400)
        .expect("Missing required fields", done);
    });

    it("should return 201 for valid artist", (done) => {
      request(app)
        .post("/artists")
        .send({
          name: "Test Artist",
          bio: "Test Bio",
          socials: { twitter: "@test" },
        })
        .expect(201)
        .expect((res) => {
          assert.strictEqual(res.body.name, "Test Artist");
          assert.strictEqual(res.body.bio, "Test Bio");
          assert.deepStrictEqual(res.body.socials, { twitter: "@test" });
        })
        .end(done);
    });
  });

  describe("PATCH /artists/by-id", () => {
    it("should return 400 for missing artist ID", (done) => {
      request(app)
        .patch("/artists/by-id")
        .send({ name: "Updated Artist" })
        .expect(400)
        .expect("Invalid or missing artist ID", done);
    });

    it("should return 200 for valid update", (done) => {
      request(app)
        .post("/artists")
        .send({
          name: "Test Artist",
          bio: "Test Bio",
          socials: { twitter: "@test" },
        })
        .end((err, res) => {
          if (err) return done(err);
          const artistID = res.body.id;
          request(app)
            .patch("/artists/by-id")
            .send({
              id: artistID,
              name: "Updated Artist",
              bio: "Updated Bio",
              socials: { twitter: "@updated" },
            })
            .expect(200)
            .expect((res) => {
              assert.strictEqual(res.body.name, "Updated Artist");
              assert.strictEqual(res.body.bio, "Updated Bio");
              assert.deepStrictEqual(res.body.socials, { twitter: "@updated" });
            })
            .end(done);
        });
    });
  });

  describe("DELETE /albums/by-id/:id", () => {
    it("should return 400 for invalid album ID", (done) => {
      request(app)
        .delete("/albums/by-id/invalid")
        .expect(400)
        .expect("Invalid album ID", done);
    });

    it("should return 404 for non-existent album", (done) => {
      request(app)
        .delete("/albums/by-id/999")
        .expect(404)
        .expect("Album not found", done);
    });

    it("should return 200 for valid album deletion", (done) => {
      request(app)
        .post("/albums")
        .send({ title: "Test Album", releaseYear: 2021, genre: "Rock" })
        .end((err, res) => {
          if (err) return done(err);
          const albumID = res.body.id;
          request(app)
            .delete(`/albums/by-id/${albumID}`)
            .expect(200)
            .expect((res) => {
              assert.strictEqual(res.body.message, "Album deleted");
              assert.strictEqual(res.body.album.title, "Test Album");
            })
            .end(done);
        });
    });
  });
});
