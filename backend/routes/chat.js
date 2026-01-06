import express from 'express';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

router.post('/ask', async (req, res) => {
  const { question, history, launchName, launchData } = req.body;

  try {
    // Construct a high-priority manifest
    const missionManifest = launchName ? `
      [MISSION_MANIFEST_START]
      IDENTIFIER: ${launchName}
      VEHICLE: ${launchData?.rocket?.name || 'UNKNOWN'}
      SITE: ${launchData?.pad?.location || 'UNKNOWN'}
      AGENCY: ${launchData?.provider || 'UNKNOWN'}
      NET_DATE: ${launchData?.date || 'UNKNOWN'}
      OBJECTIVE: ${launchData?.mission?.description || 'STATED IN GLOBAL PARAMETERS'}
      [MISSION_MANIFEST_END]
    ` : 'MODE: GLOBAL_INTELLIGENCE';

    const systemPrompt = `SYSTEM_ROLE: AEROSPACE_INTELLIGENCE_ARRAY.
      CURRENT_DATE: JANUARY 2026.
      
      SOURCE_DATA:
      ${missionManifest}

      STRICT_OPERATING_PROCEDURES:
      1. Use the [MISSION_MANIFEST] as the ABSOLUTE PRIMARY SOURCE for specific mission queries.
      2. If the user asks "Explain this mission" or "Give me details," summarize the OBJECTIVE and VEHICLE from the manifest.
      3. Use **DOUBLE ASTERISKS** to bold MISSION-CRITICAL terms.
      4. Use a single asterisk (*) for bullet points.
      5. Maintain a cold, technical, industrial tone.
      6. If data is missing from the manifest, fall back to verified general knowledge.`;

    const chatHistory = (history || []).slice(-10).map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...chatHistory,
        { role: "user", parts: [{ text: question }] }
      ]
    });

    res.json({ answer: result.text });
  } catch (error) {
    console.error("MISSION CONTROL ERROR:", error);
    res.status(500).json({ error: "UPLINK FAILURE. AI OFFLINE." });
  }
});

export default router;