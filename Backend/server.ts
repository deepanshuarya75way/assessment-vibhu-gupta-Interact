import dotenv from "dotenv";

dotenv.config();

import { server } from "./app.js"; // Import the http.Server, not app



server.listen(5000, () => {
  console.log(`Server running on port ${5000} ✅`);
});