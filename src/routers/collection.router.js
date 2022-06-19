const express = require("express");
const Text = require("../models/text.model");
const Collection = require("../models/collection.model");
const auth = require("../middleware/auth");
const fs = require("fs");
const router = new express.Router();

router.post("/collection", auth, async (req, res) => {
  const collection = new Collection({
    ...req.body,
  });

  try {
    await collection.save();
    res.status(201).send(collection);
  } catch (e) {
    res.status(400).send(e);
  }
});

//get collection info
router.get("/collection/info/:collectionId", async (req, res) => {
  const id = req.params.collectionId;
  try {
    const collection = await Collection.findOne({ _id: id });

    if (!collection) {
      return res.status(404).send();
    }

    res.send(collection);
  } catch (err) {
    res.status(500).send();
  }
});

router.delete("/collection/:collectionId", auth, async (req, res) => {
  const _id = req.params.collectionId;
  const texts = await Text.find({ group: _id }).populate("group"); //find texts from collection

  if (texts.length > 0) {
  try {
    //find unique files
    const uniqueFiles = texts
      .map((item) => item.filename)
      .filter((value, index, self) => self.indexOf(value) === index);
    if (uniqueFiles.length >= 1) {
      for (let j = 0; j < uniqueFiles.length; j++) {
        const thisFileTexts = texts.filter(function (el) {
          return el.filename == uniqueFiles[j];
        });
        const fileN = `${process.cwd()}/textFiles/${uniqueFiles[j]}`.replace(
          /\\/g,
          "/"
        );
        // delete file
        fs.unlinkSync(fileN, function (err) {
          if (err) throw err;
          // if no error, file has been deleted successfully
          console.log("Files deleted.");
        });
      }
    }
  } catch (e) {
    res.status(400).send(e + "error");
  }
  }
  const collection = await Collection.deleteOne({ _id: _id });

  if (!collection) {
    return res.status(404).send();
  }

  res.send(collection);
});

//get collection files with id
router.get("/collection/id/:collectionId", auth, async (req, res) => {
  const id = req.params.collectionId;
  try {
    const texts = await Text.find({ group: id }).populate("group"); //find texts from collection
    const newTexts = [];
    for (let i = 0; i < texts.length; i++) {
      let object = {
        _id: texts[i]._id,
        filename: texts[i].filename,
        content: texts[i].content,
        tag: texts[i].tag,
      };
      newTexts.push(object);
    }

    res.json(newTexts); //send all the texts from this collection
  } catch (err) {
    res.status(500).send();
  }
});

//get unique collection files
router.get("/collection/files/:collectionId", auth, async (req, res) => {
  const id = req.params.collectionId;
  try {
    const texts = await Text.find({ group: id }).populate("group"); //find texts from collection
    //find unique files
    const uniqueFiles = texts
      .map((item) => item.filename)
      .filter((value, index, self) => self.indexOf(value) === index);

    const arrayFiles = [];
    for (let i = 0; i < uniqueFiles.length; i++) {
      let object = {
        id: i + 1,
        filename: uniqueFiles[i],
      };
      arrayFiles.push(object);
    }
    res.json(arrayFiles); //send all the filenames
  } catch (err) {
    res.status(500).send();
  }
});

//Remove all tags from collection
router.patch("/collection/clean/:id", auth, async (req, res) => {
  const _id = req.params.id;

  try {
    const texts = await Text.find({ group: _id }).populate("group");

    if (!texts) {
      return res.status(404).send();
    }

    for (let i = 0; i < texts.length; i++) {
      if(texts[i].tag){
        texts[i].tag = undefined;
        await texts[i].save();
      }   
    }
    console.log("tags cleaned successfully")
    res.send(texts);
  } catch (e) {
    res.status(400).send(e);
  }
});

//Update collection
router.patch("/collection/:collectionId", auth, async (req, res) => {
  const _id = req.params.collectionId;
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "tags"];
  const isValidOperation = updates.every((update) => {
    return allowedUpdates.includes(update);
  });

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid update" });
  }

  try {
    const collection = await Collection.findOne({
      _id: _id,
    });

    if (!collection) {
      return res.status(404).send();
    }

    updates.forEach((update) => {
      collection[update] = req.body[update];
    });
    await collection.save();

    res.send(collection);
  } catch (e) {
    res.status(400).send(e);
  }
});

//get list of collections
router.get("/collection", auth, async (req, res) => {
  const match = {};
  const sort = {};

  if (req.query.completed) {
    match.completed = req.query.completed === "true";
  }

  if (req.query.sortBy) {
    const parts = req.query.sortBy.split(":");
    sort[parts[0]] = parts[1] === "desc" ? -1 : 1;
  }

  try {
    const collections = await Collection.find({});

    if (!collections) {
      return res.status(404).send();
    }
    const newCollections = [];
    for (let i = 0; i < collections.length; i++) {
      let object = {
        _id: collections[i]._id,
        name: collections[i].name,
        tags: collections[i].tags,
      };
      newCollections.push(object);
    }

    res.send(newCollections);
  } catch (e) {
    res.status(500).send();
  }
});

module.exports = router;
