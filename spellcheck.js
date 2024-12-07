// spellcheck.js
const fs = require("fs");
const spellchecker = require("spellchecker");


function readIpynb(filePath) { // parses ipynb
  try {
    const rawData = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(rawData);
    return jsonData;
  } catch (err) {
    throw new Error("Error reading or parsing the .ipynb file: " + err.message);
  }
}


function getMarkdownCells(ipynbData) { //what the name says
  if (!ipynbData.cells) {
    throw new Error('Invalid .ipynb file: Missing "cells" key.');
  }

  const markdownCells = ipynbData.cells.filter(
    (cell) => cell.cell_type === "markdown"
  );
  return markdownCells.map((cell) => cell.source.join(" "));
}


function checkSpelling(textArray) { //spellcheck
  const misspelled = [];

  textArray.forEach((text, cellIndex) => {
    // Split text into words
    const words = text.split(/\s+/);

    words.forEach((word) => {
      // Clean word (removie punctuation + numbers)
      const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()0-9]/g, "");
      if (cleanWord && spellchecker.isMisspelled(cleanWord)) {
        const corrections =
          spellchecker.getCorrectionsForMisspelling(cleanWord);
        misspelled.push({
          word: cleanWord,
          suggestions: corrections,
          cell: cellIndex + 1,
        });
      }
    });
  });

  return misspelled;
}

module.exports = {
  readIpynb,
  getMarkdownCells,
  checkSpelling,
};
