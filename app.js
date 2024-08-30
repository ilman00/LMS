const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors")

const app = express();
app.use(cors())
app.use(bodyParser.json());


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const fileType = file.mimetype.split('/')[0]; // Get the file type (image or video)
        let uploadPath;

        if (fileType === 'image') {
            uploadPath = 'uploads/images/';
        } else if (fileType === 'video') {
            uploadPath = 'uploads/videos/';
        } else {
            return cb(new Error('File type not supported'), false);
        }

        cb(null, uploadPath); // Directory where the images will be stored
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Rename the file with the current timestamp and original extension
    },
});

const upload = multer({ storage: storage });




mongoose.connect("mongodb://127.0.0.1:27017/LMS")

const optionSchema = new mongoose.Schema({
    option1: String,
    option2: String,
    option3: String,
    option4: String
});

// Define the schema for exercises
const exerciseSchema = new mongoose.Schema({
    question: String,
    options: [optionSchema],
    correctOption: String
});

// Define the schema for contents
const contentSchema = new mongoose.Schema({
    text: String,
    img: String,
    video: String
});

// Define the schema for chapters
const chapterSchema = new mongoose.Schema({
    name: String,
    chapterCode: String,
    contents: [contentSchema],
    exercises: [exerciseSchema]
});

// Define the main subject schema
const subjectsSchema = new mongoose.Schema({
    title: String,
    code: String,
    chapters: [chapterSchema]
});


const Subject = mongoose.model("Subject", subjectsSchema);

const newSubject = new Subject({
    title: 'History',
    code: 'HST101',
    chapters: [
        {
            name: 'Chapter 1: Indus Vally Civilaization',
            chapterCode: 'HIS101CH1',
            contents: [
                {
                    text: 'Indus Vally Civilaization',
                    img: 'Indus_Vally_Civilaization.png',
                    video: 'Indus_Vally_Civilaization.mp4'
                }
            ],
            exercises: [
                {
                    question: 'Where is the remain of Indus Vally Civilaization?',
                    options: [
                        {
                            option1: 'Russia',
                            option2: 'Afghanistan',
                            option3: 'Pakistan',
                            option4: 'Egypt'
                        }
                    ],
                    correctOption: "Pakistan"
                }
            ]
        }
    ]
});

// newSubject.save().then(()=>{
//     console.log("Data saved");
// }).catch(err=>{
//     console.log("Error: ", err);
// })

// sending all Subjects name
app.get("/subject-data", (req, res) => {
    Subject.find({}, { title: 1 }).then(result => {
        if (!result) {
            return res.status(404).json({ Error: "Error retrieving data from database" });
        }
        res.json({ data: result });
    }).catch(err => {
        res.status(400).json({ error: `Error Retreving data from database: ${err}` })
    })
});



// Sending chapters Name and content of specified subject
app.get("/subject-data/for-chapters/:subjectname", (req, res) => {

    const subjectName = req.params.subjectname;

    Subject.findOne({ title: subjectName }, { "chapters.name": 1 }).then(result => {
        if (!result) {
            return res.status(404).json({ Error: "Subject not found" });
        }
        res.json({ data: result });
    }).catch(err => {
        res.status(400).json({ error: `Error Retreving data from database: ${err}` })
    })
});

// Get chapter name and contents
app.get("/subject-data/for-contents/:subjectCode/:chapterCode", (req, res) => {
    const subjectCode = req.params.subjectCode;
    const chapterCode = req.params.chapterCode;

    Subject.findOne(
        { code: subjectCode, "chapters.chapterCode": chapterCode }, // Query to find the subject and chapter
        { "chapters.$": 1 } // Only return the matched chapter
    ).then(result => {
        if (!result) {
            return res.status(404).json({ Error: "Subject Code or Chapter Code not found" });
        }
        res.json({ data: { title: result.chapters[0].name, content: result.chapters[0].contents } }); // Send the contents of the chapter
    }).catch(err => {
        res.status(400).json({ error: `Error Retrieving data from database: ${err}` });
    });
});

// Get Chatper name and exercise
app.get("/subject-data/for-exercise/:subjectName/", (req, res) => {
    const subjectName = req.params.subjectName;
    // const chapterCode  = req.params.chapterCode;

    Subject.findOne({ title: subjectName }, { 'chapters.name': 1, 'chapters.exercises': 1 }).then(result => {
        if (!result) {
            return res.status(404).json({ Error: "Subject not found" });
        }
        res.json({ data: result });
    }).catch(err => {
        res.status(400).json({ Error: err });
    });

});

// Get Chapter Exercise
app.get("/subject-data/for-exercise/:subjectCode/:chapterCode", (req, res) => {
    const subjectCode = req.params.subjectCode;
    const chapterCode = req.params.chapterCode;

    Subject.findOne(
        { code: subjectCode, "chapters.chapterCode": chapterCode }, // Query to find the subject and chapter
        { "chapters.$": 1 } // Only return the matched chapter
    ).then(result => {
        if (!result) {
            return res.status(404).json({ Error: "Subject Code or Chapter Code not found" });
        }
        res.json({ data: result.chapters[0].exercises }); // Send the contents of the chapter
    }).catch(err => {
        res.status(400).json({ error: `Error Retrieving data from database: ${err}` });
    });
});


// saving chapter in database
app.post("/subject-data/:subjectName", (req, res) => {
    const subjectName = req.params.subjectName;

    const newChapter = {
        name: req.body.chapterName,
        chapterCode: req.body.chapterCode
    };

    console.log(newChapter);

    Subject.findOne({ title: subjectName })
        .then(result => {
            if (!result) {
                return res.status(404).json({ Error: "Subject not found" });
            }

            result.chapters.push(newChapter);

            return result.save();
        })
        .then(() => {
            res.json({ Success: "Chapter Saved Successfully" });
        })
        .catch(err => {
            res.status(400).json({ Error: "Something went wrong with saving the chapter: " + err });
        });
});


const uploadFields = upload.fields([
    { name: 'image', maxCount: 1 }, // Accept 1 image file
    { name: 'video', maxCount: 1 }  // Accept 1 video file
]);

// Saving Chapter contents in database
app.post("/subject-data/:subjectName/:chapterCode", uploadFields, (req, res) => {
    const subjectName = req.params.subjectName;
    const chapterCode = req.params.chapterCode;

    const contents = {
        text: req.body.text,
        img: req.body.img,
        video: req.body.video
    }
    console.log(contents);
    Subject.updateOne({ title: subjectName, 'chapters.chapterCode': chapterCode }, { $push: { 'chapters.$.contents': contents } }).then(result => {
        if (result.nModified === 0) {
            return res.status(404).json({ Error: "Subject or Chapter not found or no change made" });
        }
    }).then(() => {
        res.json({ Success: "Contents Saved Successfully" });
    })
        .catch(err => {
            res.status(400).json({ Error: "Something went wrong with saving the Contents: " + err });
        });
});

app.post("/api/exercise-entry/:subjectCode/:chapterCode", (req, res) => {
    const chapterCode = req.params.chapterCode;
    const subjectCode = req.params.subjectCode;
    const newExercise = {
        question: req.body.question,
        options:{
            op1: req.body.op1,
            op2: req.body.op2,
            op3: req.body.op3,
            op4: req.body.op4
        }
    }

    Subject.findOne({ code: subjectCode, "chapters.chapterCode": chapterCode }, {"chapters.$.exercises": 1}).then(result=>{
        console.log(result);
        res.json(result)
    }).catch(err=>{
        console.log("Error: ", err);
    })

    
});

// deleting chapter in database
app.delete("/subject-data/:subjectName/chapter/:chapterCode", (req, res) => {
    const subjectName = req.params.subjectName;
    const chapterCode = req.params.chapterCode;

    Subject.updateOne(
        { title: subjectName },  // Find the subject by title
        { $pull: { chapters: { chapterCode: chapterCode } } }  // Remove the chapter with the specified _id
    )
        .then(result => {
            if (result.modifiedCount === 0) {
                return res.status(404).json({ Error: "Chapter not found or already deleted" });
            }
            res.json({ Success: "Chapter deleted successfully" });
        })
        .catch(err => {
            res.status(400).json({ Error: "Something went wrong with deleting the chapter: " + err });
        });
});



app.listen(3000, () => {
    console.log("Server Running on Port 3000");
});