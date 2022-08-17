const express = require('express');
const mongoose = require('mongoose');
const app = express();
const ejs = require('ejs');
const urlModel = require("./models/urlModel");
const bodyParser = require('body-parser');
const shortId = require('shortid');
const redis = require("redis");
const { promisify } = require("util");

//--------------------------------REDIS---------------------------------------------------------------------------------------------------------//
// Connect to redis
const redisClient = redis.createClient(
  13734,
  "redis-13734.c93.us-east-1-3.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);

redisClient.auth("WJGVZMI7RjjB9gFIdvrQg6JUAJmc24H5", (err) => {
  if (err) throw err;
});

redisClient.on("connect", async () => console.log("Connected to Redis......."));


//Method-setup for redis
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//--------------------------------GLOBAL MIDDELWARES--------------------------------------------------------------------------------------------//

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

//--------------------------------MONGOOSE------------------------------------------------------------------------------------------------------//
// Connect to Mongoose
mongoose.connect("mongodb+srv://venu2455:DHm29UVwJHB7glUZ@cluster0.8dmyd.mongodb.net/url-shortener?retryWrites=true&w=majority", {
  useNewUrlParser: true
})
  .then(() => console.log("MongoDb is connected"))
  .catch(err => console.log(err))

//--------------------------------MAIN LOGIC----------------------------------------------------------------------------------------------------//

app.get("/url", (req, res) => {

  urlModel.find({}, (err, allDetails) => {
    if (err) {
      console.log(err);
    } else {
      res.render("index", { shortUrls: allDetails });
    }
  });

});

app.get("/url/del", (req, res) => {

  urlModel.deleteMany({}, (err, allDetails) => {
    if (err) {
      console.log(err);
    } else {
      res.redirect('/')
    }
  });

});


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Create URL-API
app.post('/', async (req, res) => {

  try {

    const data = req.body

    const BASE_URL = 'http://localhost:3000'
    const urlCode = shortId.generate().toLowerCase();
    const shortUrl = BASE_URL + '/' + urlCode;

    data.urlCode = urlCode;
    data.shortUrl = shortUrl;

    await urlModel.create(data);

    res.redirect('/url');

  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }

});

// Get URL-API
app.get('/:urlCode', async (req, res) => {

  try {

    const urlCode = req.params.urlCode;

    const cahcedUrlData = await GET_ASYNC(`${urlCode}`);

    if (cahcedUrlData) {
      return res.status(302).redirect(JSON.parse(cahcedUrlData));
    }

    const getUrl = await urlModel.findOne({ urlCode: urlCode });
    if (!getUrl) {
      return res.status(404).send({ status: false, message: 'Url-code not found' });
    }

    await SET_ASYNC(`${urlCode}`, JSON.stringify(getUrl.longUrl));
    return res.status(302).redirect(getUrl.longUrl);

  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }

});

// SERVER LISTENING ON PORT 3000
app.listen(process.env.PORT || 3000, function () {
  console.log('Express app running on port ' + (process.env.PORT || 3000))
});