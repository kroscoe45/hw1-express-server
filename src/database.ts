import sqlite3 from "sqlite3"

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
        name TEXT NOT NULL,
        genre TEXT NOT NULL,
        yearReleased INTEGER NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        etag TEXT NOT NULL DEFAULT (lower(hex(randomblob(8))))
      )`,
      `CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        biography TEXT NOT NULL,
        socialMediaLinks TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        etag TEXT NOT NULL DEFAULT (lower(hex(randomblob(8))))
      )`,
      `CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        trackNumber INTEGER NOT NULL,
        durationSeconds INTEGER NOT NULL,
        albumId INTEGER NOT NULL,
        artistId INTEGER NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        etag TEXT NOT NULL DEFAULT (lower(hex(randomblob(8)))),
        FOREIGN KEY(albumId) REFERENCES albums(id) ON DELETE CASCADE,
        FOREIGN KEY(artistId) REFERENCES artists(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS concerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        startTime TEXT NOT NULL,
        durationMinutes INTEGER NOT NULL,
        primaryArtistId INTEGER NOT NULL,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        etag TEXT NOT NULL DEFAULT (lower(hex(randomblob(8)))),
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
    const triggers = [
      `CREATE TRIGGER IF NOT EXISTS albums_etag_update AFTER UPDATE ON albums
       BEGIN
        UPDATE albums 
        SET etag = lower(hex(randomblob(8))),
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = NEW.id
        AND (
          name != OLD.name OR 
          yearReleased != OLD.yearReleased OR 
          genre != OLD.genre
        );
       END;`,
      `CREATE TRIGGER IF NOT EXISTS artists_etag_update AFTER UPDATE ON artists
        BEGIN
          UPDATE artists 
          SET etag = lower(hex(randomblob(8))),
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = NEW.id
          AND (
            name != OLD.name OR 
            biography != OLD.biography OR 
            socialMediaLinks != OLD.socialMediaLinks
          );
        END;`,
      `CREATE TRIGGER IF NOT EXISTS tracks_etag_update AFTER UPDATE ON tracks
        BEGIN
          UPDATE tracks 
          SET etag = lower(hex(randomblob(8))),
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = NEW.id
          AND (
            title != OLD.title OR 
            trackNumber != OLD.trackNumber OR 
            durationSeconds != OLD.durationSeconds OR 
            albumId != OLD.albumId OR 
            artistId != OLD.artistId
          );
        END;`,
      `CREATE TRIGGER IF NOT EXISTS concerts_etag_update AFTER UPDATE ON concerts
        BEGIN
          UPDATE concerts 
          SET etag = lower(hex(randomblob(8))),
              updatedAt = CURRENT_TIMESTAMP
          WHERE id = NEW.id
          AND (
            startTime != OLD.startTime OR 
            durationMinutes != OLD.durationMinutes OR 
            primaryArtistId != OLD.primaryArtistId
          );
        END;`,
    ]

    try {
      await this.db.serialize(async () => {
        for (const table of tables) {
          await this.run(table)
        }
        for (const trigger of triggers) {
          await this.run(trigger)
        }
      })
    } catch (error) {
      console.error("Error initializing database:", error)
      throw error
    }
  }
}

export default new Database()
