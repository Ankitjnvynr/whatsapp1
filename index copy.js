const express = require('express');
const venom = require('venom-bot');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// API to send media (including videos)
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
            const chatId = `${number.replace(/\D/g, '')}@c.us`; // Ensure proper number format
            await client.sendFile(chatId, filePath, req.file.originalname, caption || '');
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

// Start the Express server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
