import z from "zod";
import { getBestTitle } from "../services/openai.js";
import type { PeopleSearchAPIResponse } from "../services/apollo.js";
import type { PipelineContext, PipelineStage } from "../pipeline.js";

const GetBestContactInputSchema = z.object({
  'Organization Name': z.string(),
  people: z.array(z.object({
    id: z.string(),
    first_name: z.string(),
    last_name_obfuscated: z.string(),
    title: z.string(),
    has_email: z.boolean(),
    last_refreshed_at: z.string()
  }))
})
type GetBestContactInput = z.infer<typeof GetBestContactInputSchema>

const GetBestContactOutputSchema = GetBestContactInputSchema.extend({
  bestContactId: z.string()
})
type GetBestContactOutput = z.infer<typeof GetBestContactOutputSchema>

async function getBestContactWithLlm(returnedPeople: PeopleSearchAPIResponse['people'], titlesToSearch: string[]) {
  const returnedTitles = returnedPeople.map(person => person.title);
  const bestTitle = await getBestTitle(returnedTitles, titlesToSearch);

  if (!bestTitle) return;

  const match = returnedPeople.find(person => person.title.trim().toUpperCase() === bestTitle.trim().toUpperCase());
  return match;
}

export class GetBestContactStage implements PipelineStage<GetBestContactInput, GetBestContactOutput> {
  name = 'Get best contact from Apollo (just ID)'

  async process(input: GetBestContactInput, context: PipelineContext): Promise<GetBestContactOutput> {
    GetBestContactInputSchema.parse(input)
    let bestContactId

    // FIRST: Select solo option if there is only one
    if (input.people.length === 1) {
      bestContactId = input.people[0]?.id

      if (!bestContactId) {
        context.throwError(`Cannot extract singular best contact for ${input["Organization Name"]} - ${JSON.stringify(input.people)}`)
      }

      return {
        ...input,
        bestContactId
      }
    }

    // SECOND: Try to match exactly the correct title to the returned people (in priority sequence)
    for (const title of context.config.titlesToSearch) {
      const match = input.people.find(
        person => person.title.trim().toUpperCase() === title.trim().toUpperCase()
      );
      if (match && match.id) {
        return {
          ...input,
          bestContactId: match.id
        }
      }
    }

    // THIRD: Enlist help of OpenAI to match best fitting title
    const bestContact = await getBestContactWithLlm(input.people, context.config.titlesToSearch);
    context.tracker.incrementOpenAiCalls()

    if (!bestContact || !bestContact.id) {
      context.throwError(`Could not find an appropriate contact at ${input["Organization Name"]}`)
    }

    return {
      ...input,
      bestContactId: bestContact.id
    }
  }
}
