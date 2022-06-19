const express = require("express");
const cors = require("cors");

require("./db/mongoose");
const userRouter = require("./routers/user.router");
const imageRouter = require("./routers/text.router");
const collectionRouter = require("./routers/collection.router");

const app = express();

app.use(cors());
app.use(express.json());
app.use('/textFiles', express.static('textFiles'));
app.use(userRouter);
app.use(imageRouter);
app.use(collectionRouter);


module.exports = app;
