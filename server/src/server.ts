import { app } from "./app.js";
import { config } from "./utils/conf.js";
import { startWelcomeEmailService } from "./utils/welcome-email-service.js";

app.listen(config.PORT, (): void => {
  console.log(`Aroma API listening on port ${config.PORT}`);
  startWelcomeEmailService();
});
