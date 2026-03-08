
import { Mastra } from '@mastra/core/mastra';
import { D1Store } from '@mastra/cloudflare-d1';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare';
import { PinoLogger } from '@mastra/loggers';
import { weatherWorkflow } from './workflows/weather-workflow';
import { dictionaryAgent } from './agents/dictionary-agent';
import { weatherAgent } from './agents/weather-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';

function createStorage() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

  if (accountId && apiToken && databaseId) {
    return new D1Store({
      id: 'mastra-d1-storage',
      accountId,
      apiToken,
      databaseId,
      tablePrefix: 'mastra_',
    });
  }

  return undefined;
}

export const mastra = new Mastra({
  deployer: new CloudflareDeployer({
    name: 'mastra-app',
  }),
  workflows: { weatherWorkflow },
  agents: { weatherAgent, dictionaryAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: createStorage(),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
