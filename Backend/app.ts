import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import { mongoconnect } from "./config/Mongoose-connect.js";
import authRoutes from "./modules/Auth_modules/Auth_routes.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import http from "http";
import { socketcontroller } from "./socket/Socket_controller.js";
import roomrouter from "./modules/Room_modules/Room_routes.js";
import session from "express-session";
import passport from "passport";
import googleroutes from "./modules/GoogleAuth_modules/Google_route.js";
import "./config/passport.js";
import { initChatServices } from "./modules/Room_modules/Room_controller.js";
import helmet from "helmet";

const host = process.env.HOST;
const port  = process.env.PORT_REDIS;
const password = process.env.PASSWORD;
const app = express();
const CLIENT_URI = process.env.CLIENT_URI;
import Redis from "ioredis";
export const server = http.createServer(app);

export const io: any = new Server(server, {
  cors: {
    origin: CLIENT_URI,
    credentials: true,
  },
});
app.use(
  cors({
    origin: "http://localhost:5173" ,
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  }),
);

export const redis: any = new Redis({
  host: host,
  port: parseInt(port!),
  password: password,
});

// ✅ Bilkul alag instance
export const subscriber: any = new Redis({
  host: host,
  port: parseInt(port!),
  password: password,
});

redis.on("connect", async () => {
  console.log("redis connected");
  await initChatServices();
});

const isDev = process.env.NODE_ENV === "Development";
const serverURL = process.env.SERVER_URI ?? "";
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          isDev ? "ws://localhost:3000" : serverURL,
        ] as string[],
        mediaSrc: ["'self'"],
      },
    },
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "dfkgdlkmvdjfgk",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());
mongoconnect();
socketcontroller(io);

app.get("/", (req, res) => {
  res.send("Chat backend running");
});

app.use("/", googleroutes);
app.use("/auth", authRoutes);
app.use("/room", roomrouter);

export default app;
