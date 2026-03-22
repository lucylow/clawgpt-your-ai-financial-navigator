import "dotenv/config";
import { createApp } from "./http/createApp.js";
import { logger } from "./lib/logger.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

const { httpServer } = createApp();

httpServer.listen(port, () => {
  logger.info(`Agent wallet backend listening on :${port}`);
});
