import mongoose from "mongoose";
import env from "./env.js";

/**
 * Mongo connection.
 *
 * `strictQuery` is on so a typo'd filter key is an error rather than a silent
 * full-collection match — which on the admin inquiry list would be the
 * difference between "no results" and "every row in the database".
 */
mongoose.set("strictQuery", true);

export async function connectDb() {
  mongoose.connection.on("error", (err) => {
    console.error("[db] connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("[db] disconnected");
  });

  await mongoose.connect(env.mongoUri, {
    // Fail the boot in ~8s rather than hanging on an unreachable host.
    serverSelectionTimeoutMS: 8000,
  });

  const { host, port, name } = mongoose.connection;
  console.log(`[db] connected → ${host}:${port}/${name}`);
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.connection.close(false);
}

export default connectDb;
