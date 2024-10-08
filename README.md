# Twilio AI Assistant

This repository contains a Twilio + OpenAI real-time assistant application. Below are instructions on how to clone, configure, and run the application, as well as important considerations for using it.

## 1. Cloning and Starting the Application

To get started with this project, follow these steps:

### Prerequisites

- Ensure you have [Node.js](https://nodejs.org/) installed on your machine.
- You will also need to have [npm](https://www.npmjs.com/) (Node Package Manager) installed, which comes with Node.js.

### Steps to Clone and Run

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-username/twilio-ai-assistant.git
   cd twilio-ai-assistant
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**

   - Copy the a `.env.test` file in the root directory and rename it to `.env`
   - Add your OpenAI API key and desired port:
     ```
     OPENAI_API_KEY=your-openai-api-key
     PORT=3000
     ```

4. **Start the Application**
   ```bash
   npm start
   ```
   The server will start running on the specified port (default is 3000).

## 2. Twilio Call Configuration

To configure Twilio to work with this application, follow these steps:

1. **Create a Twilio Account**

   - Sign up for a Twilio account if you don't have one already.

2. **Get a Twilio Phone Number**

   - Purchase a phone number from Twilio that will be used to receive calls.

3. **Configure the Twilio Phone Number**
   - Go to the Twilio Console and navigate to the phone number you purchased.
   - Under the "Voice & Fax" section, set the "A CALL COMES IN" webhook to point to your server's health endpoint:
     ```
     http://your-server-url/api/v1/agent
     ```
   - Make sure to replace `your-server-url` with the actual URL where your server is hosted (e.g., if using ngrok, use the ngrok URL).

## 3. Things to Be Aware Of

- **WebSocket Connection**: The application uses WebSocket for real-time communication with the OpenAI API. Ensure that your server can handle WebSocket connections.
- **Environment Variables**: Make sure to keep your API keys secure and do not expose them in public repositories.

- **Testing**: You can run tests using the provided `test` script in `package.json`, but you may need to implement your own tests as the current script is a placeholder.

- **Error Handling**: The application includes basic error handling, but you may want to enhance it based on your specific use case.

- **Rate Limits**: Be aware of the rate limits imposed by the OpenAI API and Twilio to avoid service interruptions.

Feel free to reach out if you have any questions or need further assistance! Moises Castellar.
