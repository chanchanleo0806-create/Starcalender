import { GoogleGenAI } from "@google/genai";
import { CalendarEvent } from "../types";

export async function getAISummary(events: CalendarEvent[], userPrompt?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenAI({ apiKey });
  
  const eventContext = events.map(e => 
    `- ${e.title} (${e.startTime} ~ ${e.endTime}) at ${e.location || 'No location'}. Date: ${e.date}`
  ).join('\n');

  const systemInstruction = `
    You are a smart calendar assistant. 
    Summarize the provided schedule. 
    IMPORTANT SECURITY RULE: Only include specific locations and exact dates/times if the user explicitly asks for them in their request. 
    Otherwise, provide a general summary of the activities and their sequence without revealing sensitive location or precise time data.
    Be concise and professional.
    Language: Korean.
  `;


  const prompt = userPrompt 
    ? `Schedule:\n${eventContext}\n\nUser Request: ${userPrompt}`
    : `Please summarize this schedule:\n${eventContext}`;

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
    },
  });

  return response.text;
}
