import express from "express";
import bodyParser from "body-parser";
import expressWs from "express-ws";
import dotenv from "dotenv";

import { agentController, mediaStreamController } from "./controller.js";

// Load environment variables from .env file
dotenv.config(); // This reads the .env file and makes the variables available in process.env

const PORT = process.env.PORT; // Get the port number from environment variables

const app = expressWs(express()).app; // Create an Express application with WebSocket support

app.use(bodyParser.json()); // Use body-parser to parse JSON request bodies

app.use(
  bodyParser.urlencoded({
    extended: true, // Allow parsing of URL-encoded data
  })
);

const apiPrefix = "/api/v1"; // Define a prefix for API routes

// Routes

// Define a route for connecting twilio with our stream endpoint
app.get(`${apiPrefix}/health`, (req, res) => {
  res.status(200).send("OK");
});

app.post(`${apiPrefix}/agent`, agentController);

// Define a WebSocket route for media streaming
app.ws(`${apiPrefix}/media-stream`, mediaStreamController);

app.listen(PORT, () => {
  // Start the server and listen on the specified port
  console.log(`Server is running on port ${PORT}`);
});

process.on("SIGINT", function () {
  // Handle the SIGINT signal (Ctrl-C)
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  process.exit(0);
});
