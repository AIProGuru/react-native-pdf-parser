import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pdfParse from 'pdf-parse';
import { Request, Response } from 'express';
// import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import { requireAuth } from '@clerk/express';
import OpenAI from "openai"
import 'dotenv/config'
import authMiddleware from './middlewares/auth';
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = 5000;


app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

app.use(requireAuth())

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_LIST_URL = 'https://api.elevenlabs.io/v1/voices';

const characterVoiceMap: { [key: string]: string } = {};

// Load available ElevenLabs voices once
let availableVoices: Array<Record<string, any>> = [];

const loadVoices = async () => {
  try {
    const response = await axios.get(ELEVENLABS_VOICE_LIST_URL, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });
    availableVoices = response.data.voices;
    console.log(`Loaded ${availableVoices.length} ElevenLabs voices`);
  } catch (error) {
    console.error('Failed to load voices from ElevenLabs', error);
  }
};

loadVoices();

app.get('/me', async (req: Request, res: Response): Promise<any> => {
  console.log("asdfasdfasdf")
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  return res.json({ ok: true });
});

app.post('/upload', authMiddleware, async (req: Request, res: Response): Promise<any> => {
  try {
    const { data, name } = req.body;

    if (!data || !name) {
      return res.status(400).json({ error: 'Missing file data or name' });
    }

    const buffer = Buffer.from(data, 'base64');

    let text = '';

    if (name.endsWith('.pdf')) {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else {
      text = buffer.toString('utf-8'); // fallback for txt files
    }

    const prompt = `
    You are a helpful assistant that extracts dialogue from a film or TV script.
    
    Given the following screenplay content, extract the dialogue as a JSON array, where each object contains:
    - "id": auto-incremented number
    - "name": the character's name (uppercase)
    - "text": the full dialogue the character speaks
    
    Exclude scene descriptions and actions.
    `

    const response = await client.responses.create({
      model: "gpt-4.1",
      instructions: prompt,
      input: text
    })

    console.log(response.output_text)
    const raw = response.output_text.trim().replace(/^```json|```$/g, '');
    let parsed = JSON.parse(raw);
    res.json({ dialogs: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

app.post('/synthesize', async (req: Request, res: Response): Promise<any> => {
  const dialogs = req.body.dialogs;

  if (!Array.isArray(dialogs)) {
    return res.status(400).json({ error: 'Invalid dialog format' });
  }

  // Assign voices dynamically
  const uniqueCharacters = [...new Set(dialogs.map(d => d.name))];
  uniqueCharacters.forEach((charName, index) => {
    if (!characterVoiceMap[charName]) {
      const voice = availableVoices[index % availableVoices.length];
      characterVoiceMap[charName] = voice.voice_id;
    }
  });

  const results = [];

  for (const dialog of dialogs) {
    const voiceId = characterVoiceMap[dialog.name];
    if (!voiceId) {
      results.push({ ...dialog, audio: null });
      continue;
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: dialog.text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
        }
      );

      const audioBuffer = response.data;
      const filename = `${uuidv4()}.mp3`;
      const filepath = path.join(__dirname, 'public', 'audio', filename);
      const fileUrl = `/audio/${filename}`;

      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, audioBuffer);

      results.push({ ...dialog, audio: fileUrl });
    } catch (err) {
      console.error(`Failed to synthesize dialog ID ${dialog.id}`, err);
      results.push({ ...dialog, audio: null });
    }
  }

  res.json(results);
});

// Serve static audio files
app.use('/audio', express.static(path.join(__dirname, 'public', 'audio')));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
