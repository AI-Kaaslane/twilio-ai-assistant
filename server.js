import express from "express";
import bodyParser from "body-parser";
import expressWs from "express-ws";
import dotenv from "dotenv";

import router from "./routes/router.js";

dotenv.config();

const PORT = process.env.PORT;

const app = expressWs(express()).app;

app.use(bodyParser.json());

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(router);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  process.exit(0);
});
