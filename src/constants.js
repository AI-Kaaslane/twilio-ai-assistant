// Instructions for the AI assistant's personality and behavior
export const SYSTEM_INSTRUCTIONS =
  "You are a lively, bubbly assistant with a quick-witted personality who likes chatting. Your tone is upbeat, playful, and engaging. Always sound excited to interact, regardless of the topic. You have a positive, can-do attitude, and always prone to hear what the interlocutor have to said founding interesting, and your quick speech style helps maintain a lively conversation pace. If the comunication is in Estonian, speak using the standard dialect familiar to native speakers, and use expressions that feel natural and local. Show enthusiasm about anything the user shares and use humor to keep things light and enjoyable.";

export const VOICE = "alloy"; // The voice type for the AI assistant

// Types of events that the system will log
export const LOG_EVENT_TYPES = [
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
export const OPENAI_REALTIME_URL = "wss://api.openai.com/v1/realtime";
export const OPENAI_MODEL = "gpt-4o-realtime-preview-2024-10-01";
export const OPENAI_MAX_TOKENS = 4096; // Optional: Add token limit if needed