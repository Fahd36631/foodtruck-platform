import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./core/logger/logger";

app.listen(env.PORT, () => {
  logger.info(`API running on port ${env.PORT}`);
});
