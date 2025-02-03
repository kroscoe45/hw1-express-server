import sqlite3 from "sqlite3"

class Database {
  private db: sqlite3.Database

  constructor() {
    this.db = new sqlite3.Database(":memory:")
    this.initializeDatabase()
  }

  private initializeDatabase() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        year INTEGER NOT NULL,
        genre TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        biography TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        trackNumber INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        albumId INTEGER NOT NULL,
        FOREIGN KEY(albumId) REFERENCES albums(id)
      )`,
      `CREATE TABLE IF NOT EXISTS concerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startTime TEXT NOT NULL,
        duration INTEGER NOT NULL,
        artistId INTEGER NOT NULL,
        FOREIGN KEY(artistId) REFERENCES artists(id)
      )`,
    ]

    this.db.serialize(() => {
      tables.forEach((table) => this.db.run(table))
    })
  }

  async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows as T[])
      })
    })
  }

  async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve(row as T)
      })
    })
  }

  async run(
    sql: string,
    params: any[] = []
  ): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err)
        else resolve({ lastID: this.lastID, changes: this.changes })
      })
    })
  }
}

export default new Database()
