import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import crunchyConfig from '../crunchy.config.js';
import config from '../environment.config.js';


export function retrieveOpenAIClient() {
  const client = new OpenAI({ apiKey: config.openai.OPENAI_API_KEY });
  return client;
}


const BestTitle = z.object({
  bestTitle: z.string(),
});

export async function getBestTitle(returnedTitles: string[], titlesToSearch: string[]) {
  const client = retrieveOpenAIClient();
  const completion = await client.chat.completions.parse({
    model: crunchyConfig.bestTitle.model,
    messages: [
      { role: 'system', content: crunchyConfig.bestTitle.systemPrompt },
      {
        role: 'user',
        content: crunchyConfig.bestTitle.userPromptGenerator(returnedTitles, titlesToSearch),
      },
    ],
    response_format: zodResponseFormat(BestTitle, 'bestTitle'),
  });

  const bestTitle = completion.choices[0]?.message.parsed;
  return bestTitle?.bestTitle;
}


type LendingCompanyConfig = {
  model: string;
  systemPrompt: string;
  outputFormat: z.ZodObject<{
    companyType: z.ZodArray<z.ZodString>
  }>;
}

export async function getLendingCompanyType(companyInfo: string, config: LendingCompanyConfig) {
  const client = retrieveOpenAIClient()
  const completion = await client.chat.completions.parse({
    model: config.model,
    messages: [
      { role: 'system', content: config.systemPrompt },
      { role: 'user', content: companyInfo }
    ],
    response_format: zodResponseFormat(config.outputFormat, 'companyType')
  })

  const companyType = completion.choices[0]?.message.parsed;
  return companyType?.companyType;
}
