import express, { Request, Response, NextFunction } from 'express';
import sqlite3 from 'sqlite3';

sqlite3.verbose();

const app = express();
app.use(express.json());
const port = 3000;

const db = new sqlite3.Database(':memory:');
const db_schema = {
  'albums'   : [{'id'               : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                {'title'            : 'STRING'},
                {'released'         : 'DATE'},
                {'numTracks'        : 'INTEGER'}],
  'artists'  : [{'id'               : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                {'name'             : 'STRING'},
                {'dob'              : 'DATE'},
                {'hometown'         : 'STRING'}],
  'tracks'   : [{'id'               : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                {'title'             : 'STRING'},
                {'pos'              : 'INTEGER'},
                {'durationSeconds'  : 'INTEGER'},
                {'albumID'          : 'INTEGER'},
                {'artistID'         : 'INTEGER'}],
  'concerts' : [{'id'               : 'INTEGER PRIMARY KEY AUTOINCREMENT'},
                {'name'             : 'STRING'},
                {'start'            : 'DATETIME'},
                {'durationMinutes'  : 'INTEGER'}],
}

interface Concert {
  startDate         : Date,
  duration          : number,
  headliner         : string,
  supportingArtists : string[]
}
interface Artist {
  name : string,
  bio : string,
  socials : { [key: string]: string };
}
interface Track {
  pos : number,
  title : string,
  duration : number
  artist : Artist
}
interface Album {
  title       : string,
  releaseYear : number,
  genre       : string
}

const hasProperties = (obj: any, keys: string[]): boolean => {
    return keys.every(key => key in obj);
}

for (const table of Object.keys(db_schema)) {
  db.run(`CREATE TABLE IF NOT EXISTS ${table}(${db_schema[table].map((col: { [key: string]: string }) => {
    return `${Object.keys(col)[0]} ${Object.values(col)[0]}`;
  }).join(', ')})`);
}

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.get('/albums/by-id/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    res.status(400).send('Invalid or missing album ID');
    return;
  }
  const query = `SELECT * FROM albums WHERE id = ?`;
  db.all(query, id, (err, rows) => {
    if (err) {
      res.status(500).send('Error retrieving album');
      return;
    }
    res.status(200).send(rows);
  });
});

app.get('artist-info/by-id:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    res.status(400).send('Invalid or missing artist ID');
    return;
  }
  const query = `SELECT * FROM artists WHERE id = ?`;
  db.all(query, id, (err, rows) => {
      if (err) {
        res.status(500).send('Error retrieving artist');
        return;
      }
      res.status(200).send(rows);
  });
});

app.post('/tracks/?:album', (req: Request, res: Response) => {
  const { albumID } = req.params;
  if (!albumID || isNaN(parseInt(albumID))) {
    res.status(400).send('Invalid or missing album ID');
    return;
  }
  if (hasProperties(req.body, ['pos', 'title', 'duration', 'artist']) === false) {
      res.status(400).send('Missing required fields');
      return;
  }
  const { pos, title, duration, artist } = { ...req.body, duration : parseInt(req.body.duration) };
  if (isNaN(duration)) {
      res.status(400).send('Invalid duration');
      return;
  }
  db.serialize(() => {
      db.run('INSERT INTO tracks (pos, title, durationSeconds, albumID, artistID) VALUES (?, ?, ?, ?, ?)', [pos, title, duration, album, artist], function(err) {
      if (err) {
          res.status(500).send('Error inserting track');
          return;
      }
      res.status(201).send({ id: this.lastID, pos, title, duration, artist });
      });
  });
});

app.get('/track-info/by-album/:albumID', (req: Request, res: Response) => {
  const { albumID } = req.params;
  if (!albumID || isNaN(parseInt(albumID))) {
    res.status(400).send('Invalid or missing album ID');
    return;
  }
  const query = `SELECT * FROM tracks WHERE albumID = ?`;
  db.all(query, albumID, (err, rows) => {
    if (err) {
      res.status(500).send('Error retrieving tracks');
      return;
    }
    res.status(200).send(rows);
  });
});

// API endpoint to get all albums
app.get('/albums', (req: Request, res: Response) => {
  db.all('SELECT title FROM albums', (err, rows) => {
    if (err) {
      res.status(500).send('Error retrieving albums');
      return;
    }
    res.status(200).send(rows);
  });
});

app.get('/albums/by-title/:title', (req: Request, res: Response) => {
  const { title } = req.params;
  if (title?.length === 0) {
    res.status(400).send('Invalid or missing title');
    return;
  }
  const query = `SELECT * FROM albums WHERE title LIKE ?`;
  db.all(query, [`%${title}%`], (err, rows) => {
    if (err) {
      res.status(500).send('Error searching for albums');
      return;
    }
    if (rows.length === 0) {
      res.status(404).send('No albums found');
      return;
    }
    // If there are multiple albums with the same title, return all of them
    if (rows.length > 1) {
      res.status(200).send(rows);
      return;
    }
    res.status(200).send(rows);
  });
});

app.post('/albums', (req: Request, res: Response) => {
  const { title, genre, releaseYear } = { ...req.body, releaseYear : parseInt(req.body.releaseYear) };
  if (hasProperties(req.body, [ 'title', 'releaseYear', 'genre']) === false) {
    res.status(400).send('Missing required fields');
    return;
  }
  if (isNaN(releaseYear)) {
    res.status(400).send('Invalid release year');
    return;
  }
  // insert the album into the sqlite3 database
  db.serialize(() => {
    db.run('INSERT INTO albums (title, releaseYear, genre) VALUES (?, ?, ?)', [title, releaseYear, genre], function(err) {
      if (err) {
        res.status(500).send('Error inserting album');
        return;
      }
      res.status(201).send({ id: this.lastID, title, releaseYear, genre });
    })
  });
});

/**
 * API endpoint to add an artist to the database
 */
app.post('/artists', (req: Request, res: Response) => {
  if (hasProperties(req.body, ['name', 'bio', 'socials']) === false) {
    res.status(400).send('Missing required fields');
    return;
  }
  const { name, bio, socials } = { ...req.body, socials : JSON.stringify(req.body.socials) };
  db.serialize(() => {
    db.run('INSERT INTO artists (name, bio, socials) VALUES (?, ?, ?)', [name, bio, socials], function(err) {      if (err) {
        res.status(500).send('Error inserting artist');
        return;
      }
      res.status(201).send({ id: this.lastID, name, bio, socials });
    });
  });
});

app.delete('/albums/by-id/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  if (isNaN(parseInt(id))) {
    res.status(400).send('Invalid album ID');
    return;
  }
  // get the album from the database to return to user after deletion
  // store in variable to return to user after deletion
  let albumToDelete;
  db.get('SELECT * FROM albums WHERE id = ?', id, (err, row) => {
    if (err) {
      res.status(500).send('Error retrieving album');
      return;
    }
    if (!row) {
      res.status(404).send('Album not found');
      return;
    }
    albumToDelete = row;
  });
  // delete the specified album from the database as well as any tracks associated with it
    db.serialize(() => {
    db.run('DELETE FROM albums WHERE id = ?', id, (err) => {
      if (err) {
        res.status(500).send('Error deleting album');
        return;
      }
    });
    db.run('DELETE FROM tracks WHERE albumID = ?', id, (err) => {
      if (err) {
        res.status(500).send('Error deleting tracks');
        return;
      }
    });
    res.status(200).send({ message: 'Album deleted', album: albumToDelete });
  });
});

app.listen(port, () => {
  console.log(`Express is listening at http://localhost:${port}`);
});