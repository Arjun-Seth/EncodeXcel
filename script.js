// Get DOM elements
const fileInput = document.getElementById("upload");
const processButton = document.getElementById("processButton");
const statusMessage = document.getElementById("status");
const downloadButton = document.getElementById("downloadButton");

// Reset status and download button when a new file is selected
fileInput.addEventListener("change", function () {
    statusMessage.textContent = ""; // Clear status message
    downloadButton.style.display = "none"; // Hide the download button
});

// SMS Length Calculator
function calculateSMSParts(text) {
    const GSM7_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ¡¿" +
                       "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿" +
                       "abcdefghijklmnopqrstuvwxyzäöñüà" +
                       "0123456789" +
                       " !\"#¤%&'()*+,-./:;<=>?";
    
    const GSM7_EXTENDED = "^{}\\[~]|€";
    
    function isGSM7(char) {
        return GSM7_BASIC.includes(char) || GSM7_EXTENDED.includes(char);
    }
    
    let isGSM7Encoding = true;
    let maxLengthSingle, maxLengthConcat;

    // Check for GSM-7 characters
    for (let char of text) {
        if (!isGSM7(char)) {
            isGSM7Encoding = false;
            break; // No need to check further if a non-GSM character is found
        }
    }

    // Define SMS character limits based on encoding
    if (isGSM7Encoding) {
        maxLengthSingle = 160;
        maxLengthConcat = 153;
    } else {
        maxLengthSingle = 70;
        maxLengthConcat = 67;
    }

    // Calculate the number of parts required
    let parts;
    if (text.length <= maxLengthSingle) {
        parts = 1;
    } else {
        parts = Math.ceil(text.length / maxLengthConcat);
    }

    return parts; // Return only the number of parts
}


// Process and encode function
processButton.addEventListener("click", function () {
    if (!fileInput.files.length) {
        alert("Please upload an Excel file first.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Assuming the first sheet in the workbook
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Check if the 3rd column has any data
        let hasData = false;
        for (let i = 1; i < jsonData.length; i++) {
            if (jsonData[i][2]) {
                // Assuming the 3rd column is index 2
                hasData = true;
                break;
            }
        }

        // If no data is found in the 3rd column, display a prompt message
        if (!hasData) {
            // statusMessage.textContent = "No data available in the Message column to encode.";
            statusMessage.innerHTML = `
        <img src="https://img.icons8.com/?size=100&id=11997&format=png&color=000000" alt="No Data Icon" style="width: 20px; vertical-align: text-top;">
        No data available in the 3rd column (Message column) to encode.
      `;
            return; // Exit the function
        }
        
        // Add a new header for the encoded data
        jsonData[1].push("Encoded Message"); // Assuming the first row is the header
        jsonData[1].push("SMS Length (PDU)"); // Assuming the first row is the header

        // Loop through the rows and encode the data in the 3rd column (index 2)
        for (let i = 2; i < jsonData.length; i++) {
            if (jsonData[i][2]) {
                const originalMessage = jsonData[i][2];
                jsonData[i][3] = encodeURIComponent(originalMessage)
                    .replace(/'/g, "%27")
                    .replace(/"/g, "%22"); // URL encoding
                    jsonData[i][4]=calculateSMSParts(originalMessage); // SMS Length
            } else {
                jsonData[i][3] = ""; // If there's no original message, set encoded message to empty
                jsonData[i][4] = 1; // If there's no original message, set sms part to 1
            }
        }

        // Create a new worksheet with the modified data
        const newSheet = XLSX.utils.aoa_to_sheet(jsonData);
        const newWorkbook = XLSX.utils.book_new();

        // Set the new sheet name to "Encoded-" + original file name without extension
        const originalFileName = fileInput.files[0].name; // Get the original file name
        const fileNameWithoutExt = originalFileName
            .split(".")
            .slice(0, -1)
            .join("."); // Remove extension
        const newSheetName = "Encoded-" + fileNameWithoutExt; // New sheet name

        XLSX.utils.book_append_sheet(newWorkbook, newSheet, newSheetName);

        // Generate a downloadable Excel file
        const newExcelFile = XLSX.write(newWorkbook, {
            bookType: "xlsx",
            type: "binary",
        });
        const blob = new Blob([s2ab(newExcelFile)], {
            type: "application/octet-stream",
        });
        const url = URL.createObjectURL(blob);

        // Set the download link to the generated URL
        downloadButton.href = url;

        // Show the download button when the file is ready
        downloadButton.style.display = "block";

        // Update status message

        // statusMessage.textContent = 'File processed successfully! Click "Download Encoded File" to download.';
        statusMessage.innerHTML = `
       <img src="./asset/icons8-success.svg" alt="Success Icon" style="width: 24px; vertical-align: middle;">
        File processed successfully! Click "Download Encoded File" to download.
      `;

    };

    reader.readAsArrayBuffer(fileInput.files[0]);
});

// Helper function to convert string to ArrayBuffer
function s2ab(s) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) {
        view[i] = s.charCodeAt(i) & 0xff;
    }
    return buf;
}
