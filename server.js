// server.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const bodyParser = require("body-parser");
const { readIpynb, getMarkdownCells, checkSpelling } = require("./spellcheck");
const fs = require("fs");
const fsPromises = fs.promises;
const { marked } = require("marked");
const app = express();
const PORT = process.env.PORT || 3000;

const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// Home Page - Upload Form
app.get("/", (req, res) => {
  res.render("index");
});

// Set EJS as templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Upload files to the 'uploads/' directory
  },
  filename: function (req, file, cb) {
    // Use the original file name
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /ipynb/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only .ipynb files are allowed!"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
}).single("notebook");

function annotateText(text, misspelledWords) {
  // Escape special regex characters in words
  const escapeRegExp = (string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Sort words by length descending to prevent partial matches
  misspelledWords.sort((a, b) => b.word.length - a.word.length);
    console.log(misspelledWords);
  misspelledWords.forEach((word) => {
    const regex = new RegExp(`\\b(${escapeRegExp(word.word)})\\b`, "g");
    text = text.replace(regex, `<span class="misspelled" data-suggestions="${word.suggestions.join(', ')}">$1</span>`);
  });

  return text;
}

// Handle File Upload and Spellcheck
app.post("/upload", async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      // Handle Multer-specific errors
      let errorMessage = "";
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          errorMessage = "File size exceeds the 10 MB limit.";
          break;
        case "LIMIT_UNEXPECTED_FILE":
          errorMessage = err.message || "Unexpected file upload error.";
          break;
        default:
          errorMessage = "File upload error: " + err.message;
      }
      return res.status(400).render("index", { error: errorMessage });
    } else if (err) {
      // Handle other errors
      return res
        .status(400)
        .render("index", { error: "Error uploading file: " + err.message });
    }

    if (!req.file) {
      return res.status(400).render("index", { error: "No file uploaded." });
    }

    const filePath = path.join(UPLOADS_DIR, req.file.filename);

    try {
      const ipynbData = readIpynb(filePath);
      const markdownTexts = getMarkdownCells(ipynbData);
      const misspelledWords = checkSpelling(markdownTexts);
      const misspelledByCell = {};
      misspelledWords.forEach((item) => {
        if (!misspelledByCell[item.cell]) {
          misspelledByCell[item.cell] = [];
        }
        misspelledByCell[item.cell].push(item);
      });

      const annotatedMarkdowns = markdownTexts.map((text, index) => {
        const cellNumber = index + 1;
        const wordsToAnnotate = misspelledByCell[cellNumber] || [];
        return annotateText(text, wordsToAnnotate);
      });
      const annotatedHtml = annotatedMarkdowns.map((markdown) =>
        marked.parse(markdown)
      );

      // Render results
      res.render("result", {
        results: misspelledWords,
        annotatedHtml: annotatedHtml,
      });
    } catch (error) {
      console.error("Processing error:", error);
      res.status(500).render("index", {
        error: "Error processing the notebook: " + error.message,
      });
    } finally {
      // delete uploaded file regardless of success or failure
      try {
        await fsPromises.unlink(filePath);
      } catch (unlinkError) {
        console.error("Error deleting uploaded file:", unlinkError);
      }
    }
  });
});

// Redirect all 404s to homepage
app.use((req, res, next) => {
  if (req.path != "/") res.status(404).redirect("/");
});
// Start the Server!!
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
