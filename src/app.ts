import express from "express"
import { AlbumResource } from "./resources/album"
import { ArtistResource } from "./resources/artist"
import { TrackResource } from "./resources/track"
import { ConcertResource } from "./resources/concert"
import { ApiResponse } from "./types"

const app = express()
const port = process.env.PORT || 3000

// Middleware
app.use(express.json())

// Initialize resources
const albumResource = new AlbumResource()
const artistResource = new ArtistResource()
const trackResource = new TrackResource()
const concertResource = new ConcertResource()

// Mount resource routers
app.use("/albums", albumResource.getRouter())
app.use("/artists", artistResource.getRouter())
app.use("/tracks", trackResource.getRouter())
app.use("/concerts", concertResource.getRouter())

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack)
    const response: ApiResponse<null> = {
      error: "Internal Server Error",
      links: {
        self: {
          href: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
          rel: "self",
        },
      },
    }
    res.status(500).json(response)
  }
)

// Start server only if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })
}

export default app
