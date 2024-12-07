// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const { readIpynb, getMarkdownCells, checkSpelling } = require('./spellcheck');
const fs = require("fs")
const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Upload files to the 'uploads/' directory
    },
    filename: function (req, file, cb) {
        // Use the original file name
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        const filetypes = /ipynb/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only .ipynb files are allowed!'));
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB file size limit
}).single('notebook');



// Home Page - Upload Form
app.get('/', (req, res) => {
    res.render('index');
});

// Handle File Upload and Spellcheck
app.post('/upload', (req, res) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            // Multer errors
            return res.status(400).render('index', { error: err.message });
        } else if (err) {
            // Other errors
            return res.status(400).render('index', { error: err.message });
        }

        if (!req.file) {
            return res.status(400).render('index', { error: 'No file uploaded.' });
        }

        const filePath = path.join(__dirname, req.file.path);

        try {
            const ipynbData = readIpynb(filePath);
            const markdownTexts = getMarkdownCells(ipynbData);
            const misspelledWords = checkSpelling(markdownTexts);

            // delete file after processing
            fs.unlinkSync(filePath);

            res.render('result', { results: misspelledWords });
        } catch (error) {
            // delete file in case of error
            fs.unlinkSync(filePath);
            res.status(500).render('index', { error: error.message });
        }
    });
});



// Start the Server!!
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});