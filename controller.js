import WebSocket from "ws"; // Importing the WebSocket library for real-time communication
const fs = require("fs").promises;
const path = require("path");

// Instructions for the AI assistant's personality and behavior
const SYSTEM_INSTRUCTIONS =
  "You are a lively, bubbly assistant with a quick-witted personality who likes chatting. Your tone is upbeat, playful, and engaging. Always sound excited to interact, regardless of the topic. You have a positive, can-do attitude, and always prone to hear what the interlocutor have to said founding interesting, and your quick speech style helps maintain a lively conversation pace. If the comunication is in Estonian, speak using the standard dialect familiar to native speakers, and use expressions that feel natural and local. Show enthusiasm about anything the user shares and use humor to keep things light and enjoyable.";
const VOICE = "alloy"; // The voice type for the AI assistant

// Types of events that the system will log
const LOG_EVENT_TYPES = [
  "response.content.done",
  "response.content.start",
  "response.content.part",
  "rate_limits.updated",
  "response.done",
  "input_audio_buffer.committed",
  "input_audio_buffer.speech_stopped",
  "input_audio_buffer.speech_started",
  "session.created",
];

// Add these constants at the top with the other constants
const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime";
const OPENAI_MODEL = "gpt-4o-realtime-preview-2024-10-01";
const OPENAI_MAX_TOKENS = 4096; // Optional: Add token limit if needed

// Function to handle incoming requests for the AI agent
export function agentController(req, res) {
  // Creating a response in XML format for Twilio
  const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Say>Please wait while we connect your call to the A. I. voice assistant, powered by Twilio and the Open-A.I. Realtime API</Say>
        <Pause length="1"/>
        <Say>O.K. you can start talking!</Say>
        <Connect>
            <Stream url="wss://${req.headers.host}/api/v1/media-stream" />
        </Connect>
    </Response>`;

  res.type("text/xml"); // Set the response type to XML
  res.status(200).send(twimlResponse); // Send the response back to the client
}

// Function to manage the media stream connection
export function mediaStreamController(connection, req) {
  console.log("Client connected to media stream"); // Log when a client connects

  // Add timeout constants
  const CALL_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  const WARNING_TIME = 30 * 1000; // Warning 30 seconds before timeout

  // Declare timeout IDs for the warning and final timeout
  let warningTimeoutId;
  let finalTimeoutId;

  // Create a WebSocket connection to the OpenAI API
  const openAiWs = new WebSocket(
    `${OPENAI_REALTIME_URL}?model=${OPENAI_MODEL}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, // Use the API key for authorization
        "OpenAI-Beta": "realtime=v1", // Specify the version of the API
      },
    }
  );

  let streamSid = null; // Variable to hold the stream ID

  // Add transcript tracking variables
  let conversationTranscript = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const transcriptPath = path.join(
    process.cwd(),
    "transcripts",
    `conversation-${timestamp}.txt`
  );

  // Helper function to append to transcript
  async function appendToTranscript(speaker, text) {
    const entry = `[${new Date().toISOString()}] ${speaker}: ${text}\n`;
    conversationTranscript.push(entry);

    // Ensure transcripts directory exists and write to file
    try {
      await fs.mkdir(path.join(process.cwd(), "transcripts"), {
        recursive: true,
      });
      await fs.appendFile(transcriptPath, entry);
    } catch (error) {
      console.error("Error writing transcript:", error);
    }
  }

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
        // Add optional parameters
        max_tokens: OPENAI_MAX_TOKENS,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
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

  // Add a flag to track if we're getting a complete response
  let isReceivingResponse = false;
  let currentResponse = "";

  // Listen for messages from the OpenAI WebSocket
  openAiWs.on("message", (data) => {
    try {
      const response = JSON.parse(data.toString());

      // Handle different response types
      switch (response.type) {
        case "response.content.start":
          isReceivingResponse = true;
          currentResponse = "";
          break;

        case "response.content.part":
          if (response.content.text) {
            currentResponse += response.content.text;
          }
          break;

        case "response.content.done":
          isReceivingResponse = false;
          if (currentResponse) {
            appendToTranscript("AI", currentResponse.trim());
          }
          break;
      }

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
      const data = JSON.parse(message);

      // Add connection state validation
      if (openAiWs.readyState !== WebSocket.OPEN) {
        console.warn(
          "OpenAI WebSocket is not open. Current state:",
          openAiWs.readyState
        );
        return;
      }

      switch (data.event) {
        case "start":
          streamSid = data.start.streamSid;
          console.log("Incoming stream has started", streamSid);

          // Initialize timeouts when stream starts
          warningTimeoutId = setTimeout(() => {
            if (openAiWs.readyState === WebSocket.OPEN) {
              const warningMessage = {
                type: "text",
                text: "I need to let you know that our conversation will end in 30 seconds due to the time limit. It's been a pleasure talking with you!",
              };
              openAiWs.send(JSON.stringify(warningMessage));
            }
          }, CALL_TIMEOUT - WARNING_TIME);

          finalTimeoutId = setTimeout(() => {
            console.log(
              "Call duration limit reached (10 minutes). Closing connection."
            );
            if (openAiWs.readyState === WebSocket.OPEN) {
              const goodbyeMessage = {
                type: "text",
                text: "Our time is up now. Thank you for the conversation. Goodbye!",
              };
              openAiWs.send(JSON.stringify(goodbyeMessage));

              setTimeout(() => {
                // Close the WebSocket connection to the OpenAI API 5 secs after the goodbye message
                openAiWs.close();
                if (connection.readyState === WebSocket.OPEN) {
                  connection.close();
                }
              }, 5000);
            }
          }, CALL_TIMEOUT);
          break;
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
        default:
          console.log("Received non-media event:", data.event); // Log any other events
          break;
      }
    } catch (error) {
      console.error("Error parsing message:", error, "Message:", message); // Log any errors
    }
  });

  // Handle connection close
  connection.on("close", async () => {
    clearTimeout(warningTimeoutId);
    clearTimeout(finalTimeoutId);

    // Add final timestamp to transcript
    await appendToTranscript("SYSTEM", "Conversation ended");

    if (openAiWs.readyState === WebSocket.OPEN) openAiWs.close(); // Close the WebSocket if it's open
    console.log("Client disconnected. Transcript saved to:", transcriptPath); // Log when a client disconnects
  });

  // Handle WebSocket close and errors
  openAiWs.on("close", () => {
    console.log("Disconnected from the OpenAI Realtime API"); // Log disconnection
  });

  openAiWs.on("error", (error) => {
    console.error("Error in the OpenAI WebSocket:", error); // Log any WebSocket errors
  });
}

// Add graceful shutdown handling
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM. Closing connections gracefully...");

  if (openAiWs.readyState === WebSocket.OPEN) {
    openAiWs.close();
  }
  if (connection.readyState === WebSocket.OPEN) {
    connection.close();
  }
});
