// This is a node script to delete all URi props from a JSON

const fs = require("fs");

// Function to recursively remove "uri" properties from an object
function removeUriProperties(obj) {
  if (Array.isArray(obj)) {
    obj.forEach((item) => removeUriProperties(item));
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      if (key === "uri") {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        removeUriProperties(obj[key]);
      }
    }
  }
}

// Read the JSON file
fs.readFile("data/FILE.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error reading the file:", err);
    return;
  }

  let jsonObject;
  try {
    jsonObject = JSON.parse(data);
  } catch (parseErr) {
    console.error("Error parsing JSON:", parseErr);
    return;
  }

  // Remove "uri" properties
  removeUriProperties(jsonObject);

  // Write the updated JSON back to the file
  fs.writeFile(
    "data/FILE_noURI.json",
    JSON.stringify(jsonObject, null, 2),
    (writeErr) => {
      if (writeErr) {
        console.error("Error writing the file:", writeErr);
      } else {
        console.log("File successfully written to output.json");
      }
    }
  );
});
