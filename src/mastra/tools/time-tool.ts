import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}

interface TimeResponse {
  current: {
    time: string;
  };
  timezone: string;
  timezone_abbreviation: string;
  utc_offset_seconds: number;
}

export const timeTool = createTool({
  id: 'get-local-time',
  description: 'Get the current local date and time for a location',
  inputSchema: z.object({
    location: z.string().describe('City or place name'),
  }),
  outputSchema: z.object({
    location: z.string(),
    localTime: z.string(),
    localDate: z.string(),
    timezone: z.string(),
    timezoneAbbreviation: z.string(),
    utcOffsetSeconds: z.number(),
  }),
  execute: async ({ location }) => {
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${location}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    const timeUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`;
    const response = await fetch(timeUrl);
    const data = (await response.json()) as TimeResponse;

    return {
      location: name,
      localTime: data.current.time,
      localDate: data.current.time.slice(0, 10),
      timezone: data.timezone,
      timezoneAbbreviation: data.timezone_abbreviation,
      utcOffsetSeconds: data.utc_offset_seconds,
    };
  },
});
