import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import express from "express";
import moment from "moment";
import logger from "morgan";
import { createServer } from "node:http";
import { Server } from "socket.io";

dotenv.config();

const port = process.env.PORT || 5000;
const env = process.env.ENVIRONMENT || "dev";

const app = express();
const server = createServer(app);

app.use(logger(env));

const db = createClient({
  url: process.env.DB_URL,
  authToken: process.env.DB_TOKEN,
});

// await db.execute("DROP TABLE IF EXISTS messages;");

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(150),
    content TEXT,
    create_at DATETIME NOT NULL
  );
`);

const io = new Server(server, {
  connectionStateRecovery: {},
});

io.on("connection", async (socket) => {
  console.log("a user has connected!");

  socket.on("chat message", async (msg, username) => {
    let result;
    const createAt = moment().format("YYYY-MM-DD HH:mm:ss");

    try {
      result = await db.execute({
        sql: `INSERT INTO messages (content, username, create_at) VALUES (:content, :username, :createat)`,
        args: {
          content: msg,
          username,
          createat: createAt,
        },
      });
    } catch (e) {
      console.error(e);
      return;
    }

    io.emit(
      "chat message",
      msg,
      result.lastInsertRowid.toString(),
      username,
      moment(createAt).format("HH:mm")
    );
  });

  socket.on("disconnect", () => {
    console.log("an user has disconnected!");
  });

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: "SELECT * FROM messages WHERE id > ?",
        args: [socket.handshake.auth.serverOffset ?? 0],
      });

      results.rows.forEach((row) => {
        socket.emit("chat message", row.content, row.id.toString(), row.username);
      });
    } catch (e) {
      console.error(e);
      return;
    }
  }
});

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/client/index.html");
});

server.listen(port, () => {
  console.log(`listening on port http://localhost:${port}`);
});
