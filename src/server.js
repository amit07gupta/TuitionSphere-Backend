require("dotenv").config();

const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(
    `TuitionSphere API running on port ${env.port} in ${env.nodeEnv} mode`
  );
});