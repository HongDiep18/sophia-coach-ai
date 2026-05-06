import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createServer } from "node:http";
import { attachVoiceWsServer } from "./ws/voice.ws.js";

const app = createApp();

const server = createServer(app);
attachVoiceWsServer(server);

server.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
  console.log(`Voice WS on ws://localhost:${env.PORT}/ws/voice`);
});
