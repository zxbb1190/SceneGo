import { env } from "./config/env.js";
import { createServer } from "./server.js";

const app = createServer();

app.listen(env.PORT, () => {
  console.log(`SceneGo API listening on http://localhost:${env.PORT}`);
});
