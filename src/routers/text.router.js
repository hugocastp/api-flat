const express = require("express");
const router = new express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const csv2j = require("csvtojson");
const converter = require("json-2-csv");
const { parse } = require("csv-parse/sync");
const JSZip = require("jszip");
const fs = require("fs");
const Collection = require("../models/collection.model");
const Text = require("../models/text.model");

// Multer Setup -------------------------------------//
const storage = multer.diskStorage({
  // Store files in the API directory
  destination: function (req, file, callback) {
    callback(null, "./textFiles");
  },
  // Name files the current time + the original filename
  filename: function (req, file, callback) {
    callback(null, Date.now() + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 3 * 1024 * 1024,
  },
});

//TEXTS -------------------------------------------//
// An array of files is passed into the funciton which contains 1 or more files
// to be processed. Stores the text name, description, and category in the
// database
router.post(
  "/texts/:collectionId",
  auth,
  upload.single("inpFile"),
  async (req, res) => {
    let texts = [],
      columnTexts = [],
      records = [];
    const keys = Object.keys(req.body);
    if (keys.length < 1) {
      return res.status(400).send({ error: "No columns selected" });
    }
    const id = req.params.collectionId;
    const column = req.body.column;
    const csvFile = req.file;
    console.log(column);
    (async function () {
      const fileN = `${process.cwd()}/textFiles/${csvFile.filename}`.replace(
        /\\/g,
        "/"
      );

      const fileContent = fs.readFileSync(fileN, "utf8");
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
     // console.log(records);
    })();

    (async function () {
      //map the output from csv-parse to the column
      columnTexts = records.map((rec) => {
        //console.log("rec:",rec);
        console.log("column:",rec[`${column.trim()}`]);
        return rec[`${column.trim()}`]; 
      });
      console.log("columnTexts",columnTexts);
    })();

    try {
      columnTexts.forEach(async (txt) => {
        let text = new Text({
          content: txt,
          filename: csvFile.filename,
          group: id,
        });
        texts.push(text);
        await text.save();
      });
      res.status(201).send(texts);
    } catch (e) {
      res.status(400).send(e);
    }
  }
);

router.get("/texts/:id", auth, async (req, res) => {
  const _id = req.params.id;
  try {
    const text = await Text.findOne({ _id: _id });
    if (!text) {
      return res.status(404).send();
    }

    res.send(text);
  } catch (e) {
    res.status(500).send();
  }
});

//Download multiple texts -------------------------------------//
router.get("/download/:collectionId", async (req, res) => {
  const _id = req.params.collectionId;
  const collectionInfo = await Collection.findOne({ _id: _id });
  const collectionTxt = await Text.find({ group: _id }).populate("group"); //find texts from collection
  const zip = new JSZip();
  let fileConverted = undefined;
  //find unique files
  const uniqueFiles = collectionTxt
    .map((item) => item.filename)
    .filter((value, index, self) => self.indexOf(value) === index);
  if (uniqueFiles.length > 1) {
    for (let j = 0; j < uniqueFiles.length; j++) {
      const thisFileTexts = collectionTxt.filter(function (el) {
        return el.filename == uniqueFiles[j];
      });
      const fileN = `${process.cwd()}/textFiles/${uniqueFiles[j]}`.replace(
        /\\/g,
        "/"
      );
      const csv = fs.readFileSync(fileN, { base64: true });
      (async function () {
        const jsonArray = await csv2j().fromFile(fileN);
        for (let i = 0; i < jsonArray.length; i++) {
          if (thisFileTexts[i].tag === undefined) {
            jsonArray[i]["tag"] = "NOT TAGGED";
          } else {
            jsonArray[i]["tag"] = thisFileTexts[i].tag;
          }
        }
        fileConverted = converter.json2csv(jsonArray, (err, csv) => {
          if (err) {
            throw err;
          }
          (async () => {
            try {
              await fs.writeFileSync(`downloads/TAGGED-${uniqueFiles[j]}`, csv);
            } catch (e) {
              console.error("error", e.message);
            }
          })();
        });
      })();
    }
    // Make a new text file README
    zip.file(
      "README.txt",
      "Thank you for using Free Language Annotation Tool!"
    );
    // Make a new folder to store documents
    let csvs = zip.folder("");
    for (const document of uniqueFiles) {
      let documentF = `${process.cwd()}/downloads/TAGGED-${document}`.replace(
        /\\/g,
        "/"
      );
      csvs.file(
        documentF.replace(/.*\//g, ""),
        fs.readFileSync(documentF, { base64: true })
      );
    }
    // Convert the zip file into a buffer
    const content = await zip.generateAsync({ type: "nodebuffer" });
    // Save the zip file
    const zipName = `${collectionInfo.name}-files.zip`;
    fs.writeFileSync(`downloads/${zipName}`, content);
    // Sends new zipped file to the client for download
    const zippedFile = `/downloads/${zipName}`;
    res.download(process.cwd() + zippedFile, zipName, (err) => {
      // fs.unlinkSync(process.cwd() + zippedFile);
      if (err) {
        res.status(500).send({
          message: "Could not download the file. " + err,
        });
      }
    });
  } else {
    const fileN = `${process.cwd()}/textFiles/${uniqueFiles[0]}`.replace(
      /\\/g,
      "/"
    );
    const csv = fs.readFileSync(fileN, { base64: true });
    (async function () {
      const jsonArray = await csv2j().fromFile(fileN);
      for (let i = 0; i < jsonArray.length; i++) {
        if (collectionTxt[i].tag === undefined) {
          jsonArray[i]["tag"] = "Not Tagged";
        } else {
          jsonArray[i]["tag"] = collectionTxt[i].tag;
        }
      }
      fileConverted = converter.json2csv(jsonArray, (err, csv) => {
        if (err) {
          throw err;
        }
        fs.writeFileSync(
          `downloads/${collectionInfo.name}-${uniqueFiles[0]}`,
          csv
        );
        console.log("File created");
      });
    })();

    // Sends new file to the client for download
    const csvFile = `/downloads/${collectionInfo.name}-${uniqueFiles[0]}`;
    //Comprimir en zip si existen multiples archivos, si no, enviar solo
    res.download(
      process.cwd() + csvFile,
      `${collectionInfo.name}-${uniqueFiles[0]}`,
      (err) => {
        //fs.unlinkSync(process.cwd() + csvFile);
        if (err) {
          res.status(500).send({
            message: "Could not download the file. " + err,
          });
        }
      }
    );
  }
});

//Add tag
router.patch("/texts/:id", auth, async (req, res) => {
  const _id = req.params.id;
  const updates = Object.keys(req.body);
  const allowedUpdates = ["tag"];
  const isValidOperation = updates.every((update) => {
    return allowedUpdates.includes(update);
  });

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid update" });
  }

  try {
    const text = await Text.findOne({ _id: _id });

    if (!text) {
      return res.status(404).send();
    }

    if (!text.tag) {
      text.tag = req.body.tag;
    } else {
      return res.status(404).send({ error: "Already tagged" });
    }
    await text.save();
    res.send(text);
  } catch (e) {
    res.status(400).send(e);
  }
});

//Remove last tag
router.patch("/texts/delete/:id", auth, async (req, res) => {
  const _id = req.params.id;
  const updates = Object.keys(req.body);
  const allowedUpdates = ["tag"];
  const isValidOperation = updates.every((update) => {
    return allowedUpdates.includes(update);
  });

  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid update" });
  }

  try {
    const text = await Text.findOne({ _id: _id });
    console.log(text);
    if (!text) {
      return res.status(404).send();
    }

    text.tag = undefined;
    await text.save();

    res.send(text);
  } catch (e) {
    res.status(400).send(e);
  }
});



router.delete("/texts/:id", auth, async (req, res) => {
  const _id = req.params.id;

  try {
    const text = await Text.findOneAndDelete({ _id: _id });

    if (!text) {
      return res.status(404).send();
    }

    res.send(text);
  } catch (e) {
    res.status(400).send(e);
  }
});

// Deletes multiple texts
router.delete("/texts/mult/:ids", auth, async (req, res) => {
  var ids = req.params.ids;
  var selectedRecords = ids.split(",");

  // TEST LINES - REMOVE AFTER WORKING
  /*
    console.log('ARRAY LENGTH: ' + selectedRecords.length)
    console.log('IDS IN API: ' + selectedRecords);
    console.log('RECORD 1: ' + selectedRecords[0]);
    console.log('RECORD 2: ' + selectedRecords[1]);
    console.log('RECORD 3: ' + selectedRecords[2]);
    console.log('RECORD 4: ' + selectedRecords[3]);
    console.log('RECORD 5: ' + selectedRecords[4]);
    */

  for (var i = 0; i < selectedRecords.length; i++) {
    try {
      const record = await Record.deleteMany({
        _id: selectedRecords[i]
      });
    } catch (e) {
      res.status(400).send(e);
    }
  }
});

module.exports = router;
