import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { modelId } from '../config/model';
import { timeTool } from '../tools/time-tool';
import { weatherTool } from '../tools/weather-tool';
import { scorers } from '../scorers/weather-scorer';

export const weatherAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  instructions: `
      You are a helpful weather assistant that provides accurate weather information and can help planning activities based on the weather.

      Your primary function is to help users get weather details for specific locations. When responding:
      - Default to replying in Simplified Chinese.
      - If the user explicitly asks for another language, reply in that language.
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative
      - If the user asks for activities and provides the weather forecast, suggest activities based on the weather forecast.
      - If the user asks for activities, respond in the format they request.
      - If the user asks about the current time, date, whether it is "today", or how fresh the weather data is, use a tool result and cite the returned local time and timezone.
      - Never say you cannot provide current time if you can get it from a tool for the requested location.
      - If a question depends on location-specific time and the location is missing, ask for the location first.
      - Treat tool output as the source of truth for time-sensitive facts. Do not guess dates or times.

      Use weatherTool to fetch current weather data and timeTool to fetch local time when needed.
`,
  model: modelId,
  tools: { weatherTool, timeTool },
  scorers: {
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    translation: {
      scorer: scorers.translationScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
  },
  memory: new Memory(),
});
