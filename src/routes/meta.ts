import express from "express";
const router = express.Router();

//provide information to the user about the API
router.get("/?", (req, res) => {
    res.send("Available endpoints: /artists, /albums, /tracks, /concerts\n"
           + "For more information on each endpoint, use /{endpoint}/?\n");
});

export { router as metaRouter };