import { app } from "./app";
import { logger } from "./core/logger/logger";

const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  logger.info(`API running on port ${port}`);
});
