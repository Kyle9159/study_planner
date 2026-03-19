// Run migrations synchronously before starting server
import "./db/migrate.js";

import { createApp } from "./app.js";

const PORT = Number(process.env.PORT) || 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Study Planner server running on http://localhost:${PORT}`);
});
