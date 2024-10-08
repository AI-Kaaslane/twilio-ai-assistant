import WebSocket from "ws"; // Importing the WebSocket library for real-time communication

// Instructions for the AI assistant's personality and behavior
const SYSTEM_INSTRUCTIONS =
  "You are a lively, bubbly assistant with a quick-witted personality who likes chatting. Your tone is upbeat, playful, and engaging. Always sound excited to interact, regardless of the topic. You have a positive, can-do attitude, and always prone to hear what the interlocutor have to said founding interesting, and your quick speech style helps maintain a lively conversation pace. If the comunication is in Estonian, speak using the standard dialect familiar to native speakers, and use expressions that feel natural and local. Show enthusiasm about anything the user shares and use humor to keep things light and enjoyable.";
const VOICE = "alloy"; // The voice type for the AI assistant

// Types of events that the system will log
const LOG_EVENT_TYPES = [
  "response.content.done",
  "rate_limits.updated",
  "response.done",
  "input_audio_buffer.committed",
  "input_audio_buffer.speech_stopped",
  "input_audio_buffer.speech_started",
  "session.created",
];

// Function to handle incoming requests for the AI agent
export function agentController(req, res) {
  // Creating a response in XML format for Twilio
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say>Please wait while we connect your call to the A. I. voice assistant, powered by Twilio and the Open-A.I. Realtime API</Say>
        <Pause length="1"/>
        <Say>O.K. you can start talking!</Say>
        <Connect>
            <Stream url="wss://${req.headers.host}/api/v1/webhook/media-stream" />
        </Connect>
    </Response>`;

  res.type("text/xml"); // Set the response type to XML
  res.status(200).send(twimlResponse); // Send the response back to the client
}

// Function to manage the media stream connection
export function mediaStreamController(connection, req) {
  console.log("Client connected to media stream"); // Log when a client connects

  // Create a WebSocket connection to the OpenAI API
  const openAiWs = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01",
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Use the API key for authorization
        "OpenAI-Beta": "realtime=v1", // Specify the version of the API
      },
    }
  );

  let streamSid = null; // Variable to hold the stream ID

  // Function to send session updates to the OpenAI API
  const sendSessionUpdate = () => {
    const sessionUpdate = {
      type: "session.update", // Type of update
      session: {
        turn_detection: { type: "server_vad" }, // Voice activity detection type
        input_audio_format: "g711_ulaw", // Audio format for input
        output_audio_format: "g711_ulaw", // Audio format for output
        voice: VOICE, // Voice type
        instructions: SYSTEM_INSTRUCTIONS, // Instructions for the AI
        modalities: ["text", "audio"], // Types of communication
        temperature: 0.8, // Creativity level of the AI
      },
    };

    console.log("Sending session update:", JSON.stringify(sessionUpdate)); // Log the session update
    openAiWs.send(JSON.stringify(sessionUpdate)); // Send the session update to the OpenAI API
  };

  // Event handler for when the WebSocket connection opens
  openAiWs.on("open", () => {
    console.log("Connected to the OpenAI Realtime API"); // Log successful connection
    setTimeout(sendSessionUpdate, 250); // Send session update after a short delay
  });

  // Listen for messages from the OpenAI WebSocket
  openAiWs.on("message", (data) => {
    try {
      const response = JSON.parse(data.toString()); // Parse the incoming message

      // Log specific event types
      if (LOG_EVENT_TYPES.includes(response.type)) {
        console.log(`Received event: ${response.type}`, response);
      }

      // Log if the session was updated successfully
      if (response.type === "session.updated") {
        console.log("Session updated successfully:", response);
      }

      // Handle audio delta messages
      if (response.type === "response.audio.delta" && response.delta) {
        const audioDelta = {
          event: "media", // Event type
          streamSid: streamSid, // Stream ID
          media: {
            payload: Buffer.from(response.delta, "base64").toString("base64"), // Convert audio data
          },
        };
        connection.send(JSON.stringify(audioDelta)); // Send audio data to the client
      }
    } catch (error) {
      console.error(
        "Error processing OpenAI message:",
        error,
        "Raw message:",
        data // Log any errors that occur
      );
    }
  });

  // Handle incoming messages from Twilio
  connection.on("message", (message) => {
    try {
      const data = JSON.parse(message); // Parse the incoming message

      switch (data.event) {
        case "media": // If the event is media
          if (openAiWs.readyState === WebSocket.OPEN) {
            // Check if the WebSocket is open
            const audioAppend = {
              type: "input_audio_buffer.append", // Type of message
              audio: data.media.payload, // Audio data
            };

            openAiWs.send(JSON.stringify(audioAppend)); // Send audio data to OpenAI
          }
          break;
        case "start": // If the event is start
          streamSid = data.start.streamSid; // Get the stream ID
          console.log("Incoming stream has started", streamSid); // Log the stream ID
          break;
        default:
          console.log("Received non-media event:", data.event); // Log any other events
          break;
      }
    } catch (error) {
      console.error("Error parsing message:", error, "Message:", message); // Log any errors
    }
  });

  // Handle connection close
  connection.on("close", () => {
    if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close(); // Close the WebSocket if it's open
    console.log("Client disconnected."); // Log when a client disconnects
  });

  // Handle WebSocket close and errors
  openAiWs.on("close", () => {
    console.log("Disconnected from the OpenAI Realtime API"); // Log disconnection
  });

  openAiWs.on("error", (error) => {
    console.error("Error in the OpenAI WebSocket:", error); // Log any WebSocket errors
  });
}
