import express from "express";
import { agentController, mediaStreamController } from "../src/controller.js";

const router = express.Router();
const apiPrefix = "/api/v1";

router.get(`${apiPrefix}/health`, (req, res) => {
  res.status(200).send("OK");
});

router.post(`${apiPrefix}/agent`, agentController);

router.ws(`${apiPrefix}/media-stream`, mediaStreamController);

export default router;