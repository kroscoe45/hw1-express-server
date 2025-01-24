import sqlite3 from "sqlite3";

const db = new sqlite3.Database(":memory:");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      genre TEXT,
      releaseYear INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS artists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      bio TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      albumId INTEGER,
      artistId INTEGER,
      duration INTEGER,
      FOREIGN KEY(albumId) REFERENCES albums(id),
      FOREIGN KEY(artistId) REFERENCES artists(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS concerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      artistId INTEGER,
      FOREIGN KEY(artistId) REFERENCES artists(id)
    )
  `);
});

export default db;
