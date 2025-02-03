import sqlite3 from "sqlite3"
import { promisify } from "util"

export interface DbResult {
  lastID: number
  changes: number
}

class Database {
  private db: sqlite3.Database
  constructor() {
    this.db = new sqlite3.Database(":memory:")
    this.initializeDatabase()
  }

  public async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows as T[])
      })
    })
  }

  public async get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err)
        else resolve(row as T)
      })
    })
  }

  public async run(sql: string, params: any[] = []): Promise<DbResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err)
        else resolve({ lastID: this.lastID, changes: this.changes })
      })
    })
  }

  private async initializeDatabase(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        genre TEXT NOT NULL,
        releaseYear INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        etag TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        biography TEXT NOT NULL,
        socialMedia TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        etag TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        trackNumber INTEGER NOT NULL,
        durationSeconds INTEGER NOT NULL,
        albumId INTEGER NOT NULL,
        artistId INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        etag TEXT NOT NULL,
        FOREIGN KEY(albumId) REFERENCES albums(id) ON DELETE CASCADE,
        FOREIGN KEY(artistId) REFERENCES artists(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS concerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startTime TEXT NOT NULL,
        durationMinutes INTEGER NOT NULL,
        primaryArtistId INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        etag TEXT NOT NULL,
        FOREIGN KEY(primaryArtistId) REFERENCES artists(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS concert_artists (
        concertId INTEGER NOT NULL,
        artistId INTEGER NOT NULL,
        FOREIGN KEY(concertId) REFERENCES concerts(id) ON DELETE CASCADE,
        FOREIGN KEY(artistId) REFERENCES artists(id) ON DELETE CASCADE,
        PRIMARY KEY(concertId, artistId)
      )`,
    ]

    try {
      await this.db.serialize(async () => {
        for (const table of tables) {
          await this.run(table)
        }
      })
    } catch (error) {
      console.error("Error initializing database:", error)
      throw error
    }
  }
}

export default new Database()
