import express from "express";
import {
  deletecomment,
  dislikecomment,
  editcomment,
  getallcomment,
  likecomment,
  postcomment,
  reportcomment,
} from "../controllers/comment.js";

const routes = express.Router();

routes.post("/postcomment", postcomment);
routes.post("/editcomment/:id", editcomment);
routes.delete("/deletecomment/:id", deletecomment);
routes.post("/like/:id", likecomment);
routes.post("/dislike/:id", dislikecomment);
routes.post("/report/:id", reportcomment);
// keep this last — wildcard route
routes.get("/:videoid", getallcomment);

export default routes;
