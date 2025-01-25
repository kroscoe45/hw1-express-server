import express, { Request, Response } from "express";
const router = express.Router();
import artistsRouter from "./routes/artists";
import albumsRouter from "./routes/albums";
import tracksRouter from "./routes/tracks";
import concertsRouter from "./routes/concerts";
const app = express();

app.use(express.json());

app.use("/artists", artistsRouter);
app.use("/albums", albumsRouter);
app.use("/tracks", tracksRouter);
app.use("/concerts", concertsRouter);

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to the Music API");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default router;
