// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');
const { readIpynb, getMarkdownCells, checkSpelling } = require('./spellcheck');

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


// Start the Server!!
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});