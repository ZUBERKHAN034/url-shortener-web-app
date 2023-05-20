import express from "express";
import mongoose from "mongoose";
import urlModel from "./models/urlModel.js";
import shortId from "shortid";

import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { createClient } from "redis";
const app = express();

//--------------------------------REDIS---------------------------------------------------------------------------------------------------------//
// Connect to Redis

const redis = createClient({
  password: "8Y8E0BlkaoS7cuscUbz9m4101epsd3dY",
  socket: {
    host: "redis-14015.c10.us-east-1-3.ec2.cloud.redislabs.com",
    port: 14015,
  },
});

redis
  .connect()
  .then(() => console.log("Connected to Redis"))
  .catch((error) => console.log(`Error connecting to Redis: ${error}`));

//--------------------------------GLOBAL MIDDLEWARE--------------------------------------------------------------------------------------------//

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

//--------------------------------MONGOOSE------------------------------------------------------------------------------------------------------//
// Connect to Mongoose
mongoose
  .connect(
    "mongodb+srv://zuberkhan034:Khan5544266@cluster0.ouo9x.mongodb.net/url-shortener?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
    }
  )
  .then(() => console.log("MongoDb is connected"))
  .catch((err) => console.log(err));

//--------------------------------MAIN LOGIC----------------------------------------------------------------------------------------------------//

app.get("/url", (_req, res) => {
  urlModel.find({}, (err, allDetails) => {
    if (err) {
      console.log(err);
    } else {
      res.render("index", { shortUrls: allDetails });
    }
  });
});

app.get("/url/del", (_req, res) => {
  urlModel.deleteMany({}, (err, _allDetails) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/", (_req, res) => {
  const homepage = join(__dirname, "public", "index.html");
  res.sendFile(homepage);
});

// Create URL-API
app.post("/", async (req, res) => {
  try {
    const data = req.body;

    const BASE_URL = "http://localhost:3000";
    const urlCode = shortId.generate().toLowerCase();
    const shortUrl = BASE_URL + "/" + urlCode;

    data.urlCode = urlCode;
    data.shortUrl = shortUrl;

    await urlModel.create(data);

    res.redirect("/url");
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
});

// Get URL-API
app.get("/:urlCode", async (req, res) => {
  try {
    const urlCode = req.params.urlCode;

    const cachedUrlData = await redis.get(urlCode);

    if (cachedUrlData) {
      return res.status(302).redirect(JSON.parse(cachedUrlData));
    }

    const getUrl = await urlModel.findOne({ urlCode: urlCode });
    if (!getUrl) {
      return res
        .status(404)
        .send({ status: false, message: "Url-code not found" });
    }


    await redis.set(urlCode, JSON.stringify(getUrl.longUrl));
    return res.status(302).redirect(getUrl.longUrl);
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
});

// SERVER LISTENING ON PORT 3000
app.listen(process.env.PORT || 3000, function () {
  console.log("Express app running on port " + (process.env.PORT || 3000));
});
