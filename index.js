const express = require('express');
const venom = require('venom-bot');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');

const axios = require('axios'); // To download files


const { v4: uuidv4 } = require('uuid');


const app = express();
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('Created "uploads" directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 16 * 1024 * 1024 } // 16 MB limit
});

// Start Venom Client
let client;
venom
    .create({
        session: 'whatsapp-session',
        multidevice: true,
    })
    .then((venomClient) => {
        client = venomClient;
        console.log('✅ WhatsApp client is ready!');
    })
    .catch((err) => {
        console.error('❌ Error starting venom-bot:', err);
    });

// Serve HTML for frontend
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'siv.html'));
});

// API to send text messages
app.post('/api/send-message', async (req, res) => {
    const { numbers, message } = req.body; // Receive an array of numbers

    if (!client) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready yet.' });
    }

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0 || !message) {
        return res.status(400).json({ success: false, error: 'Numbers (array) and message are required.' });
    }

    const results = [];

    for (const number of numbers) {
        try {
            const chatId = `${number.replace(/\D/g, '')}@c.us`; // Ensure number format
            await client.sendText(chatId, message);
            results.push({ number, status: "✅ Sent successfully" });
        } catch (error) {
            console.error(`❌ Error sending to ${number}:`, error);
            results.push({ number, status: "❌ Failed to send" });
        }
    }

    res.status(200).json({ success: true, results });
});







// code by ankit start
app.get('/api/send-message', async (req, res) => {
    const { numbers, message, link } = req.query; // Receive numbers (comma-separated), message, and link as query parameters

    if (!client) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready yet.' });
    }

    if (!numbers || !message) {
        return res.status(400).json({ success: false, error: 'Numbers (comma-separated) and message are required.' });
    }

    const numberList = numbers.split(',').map((num) => num.trim());
    const results = [];

    let linkPreview = '';

    if (link) {
        try {
            const response = await axios.get(link);
            const $ = cheerio.load(response.data);

            // Extract metadata for link preview
            const title = $('meta[property="og:title"]').attr('content') || $('title').text();
            const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
            const image = $('meta[property="og:image"]').attr('content');
            linkPreview = `${title || ''}\n${description || ''}\n${image || ''}`;
        } catch (error) {
            console.error('❌ Error fetching link metadata:', error.message);
            linkPreview = '⚠️ Could not retrieve link preview.';
        }
    }

    for (const number of numberList) {
        try {
            const chatId = `${number.replace(/\D/g, '')}@c.us`; // Ensure proper number format
            const fullMessage = `${message}\n\n${linkPreview || ''}`; // Include metadata preview if available
            await client.sendText(chatId, fullMessage);
            results.push({ number, status: "✅ Sent successfully",message:"success" });
        } catch (error) {
            console.error(`❌ Error sending to ${number}:`, error);
            results.push({ number, status: "❌ Failed to send", error: error.message });
        }
    }

    res.status(200).json({ success: true, results });
});


// code by ankit end








// API to send media (including videos)
app.post('/api/send-media-old', upload.single('file'), async (req, res) => {
    const { numbers, caption } = req.body; // Accept multiple numbers
    const filePath = req.file?.path;

    if (!client) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready yet.' });
    }

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0 || !filePath) {
        return res.status(400).json({ success: false, error: 'Numbers (array) and file are required.' });
    }

    console.log('📂 Uploaded file path:', filePath);

    const results = [];

    for (const number of numbers) {
        try {
            var newcaption = decodeURIComponent(caption);
            const chatId = `${number.replace(/\D/g, '')}@c.us`; // Ensure proper number format
            await client.sendFile(chatId, filePath, req.file.originalname, newcaption || '');
            results.push({ number, status: "✅ Media sent successfully" });
        } catch (error) {
            console.error(`❌ Error sending media to ${number}:`, error);
            results.push({ number, status: "❌ Failed to send media" });
        }
    }

    // Delete uploaded file after processing
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('❌ Error deleting uploaded file:', err);
        } else {
            console.log(`✅ Deleted file: ${filePath}`);
        }
    });

    res.status(200).json({ success: true, results });
});















// code by ankit start
app.post('/api/send-media', upload.single('file'), async (req, res) => {
    const { numbers, caption } = req.body; // Accept multiple numbers
    const filePath = req.file?.path;

    if (!client) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready yet.' });
    }

    if (!numbers || !Array.isArray(numbers) || numbers.length === 0 || !filePath) {
        return res.status(400).json({ success: false, error: 'Numbers (array) and file are required.' });
    }

    console.log('📂 Uploaded file path:', filePath);

    const results = [];

    for (const number of numbers) {
        try {
            // Ensure caption is decoded correctly
            const formattedCaption = caption ? decodeURIComponent(caption) : '';
            const chatId = `${number.replace(/\D/g, '')}@c.us`; // Ensure proper number format

            // Send media file with the formatted caption
            await client.sendFile(chatId, filePath, req.file.originalname, formattedCaption);

            results.push({ number, status: "✅ Media sent successfully" });
        } catch (error) {
            console.error(`❌ Error sending media to ${number}:`, error);
            results.push({ number, status: "❌ Failed to send media" });
        }
    }

    // Delete uploaded file after processing
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('❌ Error deleting uploaded file:', err);
        } else {
            console.log(`✅ Deleted file: ${filePath}`);
        }
    });

    res.status(200).json({ success: true, results });
});
// code by ankit end








app.get('/api/send-media', async (req, res) => {
    const { receiverMobileNo, filePathUrl, caption } = req.query;

    if (!client) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not ready yet.' });
    }

    if (!receiverMobileNo || !filePathUrl) {
        return res.status(400).json({ success: false, error: 'ReceiverMobileNo and FilePathUrl are required.' });
    }

    const numbers = Array.isArray(receiverMobileNo) ? receiverMobileNo : [receiverMobileNo];
    const fileUrls = Array.isArray(filePathUrl) ? filePathUrl : [filePathUrl];
    const results = [];
    const tempDir = path.join(__dirname, 'temp');

    // Ensure the temp directory exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    for (let i = 0; i < numbers.length; i++) {
        const number = numbers[i];
        const fileUrl = fileUrls[i];
        const fileCaption = caption || '';

        try {
            // Download the file
            const response = await axios.get(fileUrl, { responseType: 'stream' });
            const ext = path.extname(fileUrl);
            const tempFilePath = path.join(tempDir, `${uuidv4()}${ext}`);

            // Save the file
            const writer = fs.createWriteStream(tempFilePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            console.log('📂 Downloaded file path:', tempFilePath);

            // Send the file via WhatsApp
            const chatId = `${number.replace(/\D/g, '')}@c.us`;
            await client.sendFile(chatId, tempFilePath, path.basename(tempFilePath), fileCaption);
            results.push({ number, status: "✅ Media sent successfully" });

            // Delete the temporary file after sending
            fs.unlink(tempFilePath, (err) => {
                if (err) console.error('❌ Error deleting temp file:', err);
                else console.log(`✅ Deleted temp file: ${tempFilePath}`);
            });
        } catch (error) {
            console.error(`❌ Error sending media to ${number}:`, error);
            results.push({ number, status: "❌ Failed to send media", error: error.message });
        }
    }

    res.status(200).json({ success: true, results });
});






// Start the Express server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
