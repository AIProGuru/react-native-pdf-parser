import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import pdfParse from 'pdf-parse';
import { Request, Response } from 'express';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import OpenAI from "openai"
import 'dotenv/config'
import authMiddleware from './middlewares/auth';


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

app.use(ClerkExpressWithAuth())

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

    res.json({ text: "text" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
