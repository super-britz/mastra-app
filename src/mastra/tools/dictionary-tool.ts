import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface DictionaryApiResponseItem {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings?: {
    partOfSpeech?: string;
    definitions?: {
      definition: string;
      example?: string;
      synonyms?: string[];
    }[];
  }[];
}

interface DatamuseSyllableItem {
  numSyllables?: number;
}

export const dictionaryTool = createTool({
  id: 'lookup-word',
  description: 'Look up the meaning, pronunciation, and examples for an English word',
  inputSchema: z.object({
    word: z.string().describe('The English word to look up'),
  }),
  outputSchema: z.object({
    word: z.string(),
    phonetic: z.string().optional(),
    syllabifiedPhonetic: z.string().optional(),
    syllableCount: z.number().optional(),
    syllableSplitSource: z.enum(['provided', 'unavailable']).optional(),
    meanings: z.array(
      z.object({
        partOfSpeech: z.string(),
        definitions: z.array(
          z.object({
            definition: z.string(),
            example: z.string().optional(),
            synonyms: z.array(z.string()).optional(),
          }),
        ),
      }),
    ),
  }),
  execute: async ({ word }) => {
    const normalizedWord = word.trim().toLowerCase();
    const [dictionaryResponse, datamuseResponse] = await Promise.all([
      fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`,
      ),
      fetch(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(normalizedWord)}&md=s&max=1`,
      ),
    ]);

    if (!dictionaryResponse.ok) {
      throw new Error(`Word '${normalizedWord}' not found`);
    }

    const data = (await dictionaryResponse.json()) as DictionaryApiResponseItem[];
    const syllableData = datamuseResponse.ok
      ? ((await datamuseResponse.json()) as DatamuseSyllableItem[])
      : [];
    const entry = data[0];

    if (!entry?.meanings?.length) {
      throw new Error(`No dictionary result found for '${normalizedWord}'`);
    }

    const phonetic =
      entry.phonetic || entry.phonetics?.find(item => item.text)?.text;
    const syllabifiedPhonetic = getSyllabifiedPhonetic(phonetic);
    const syllableCount = syllableData[0]?.numSyllables;

    return {
      word: entry.word || normalizedWord,
      phonetic,
      syllabifiedPhonetic,
      syllableCount,
      syllableSplitSource: syllabifiedPhonetic
        ? ('provided' as const)
        : ('unavailable' as const),
      meanings: entry.meanings
        .filter(meaning => meaning.partOfSpeech && meaning.definitions?.length)
        .slice(0, 3)
        .map(meaning => ({
          partOfSpeech: meaning.partOfSpeech || 'unknown',
          definitions: (meaning.definitions || []).slice(0, 3).map(definition => ({
            definition: definition.definition,
            example: definition.example,
            synonyms: definition.synonyms?.slice(0, 5),
          })),
        })),
    };
  },
});

function getSyllabifiedPhonetic(phonetic?: string): string | undefined {
  if (!phonetic) {
    return undefined;
  }

  // Only trust explicit syllable separators already present in the source.
  if (phonetic.includes('.')) {
    return phonetic;
  }

  if (phonetic.includes('·')) {
    return phonetic.replaceAll('·', '.');
  }

  return undefined;
}
