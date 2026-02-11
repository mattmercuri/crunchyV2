import z from "zod"
import { getPeopleEnrichment } from "../services/apollo.js"
import type { PipelineContext, PipelineStage } from "../pipeline.js"

const EnrichContactInputSchema = z.object({
  bestContactId: z.string()
})
type EnrichContactInput = z.infer<typeof EnrichContactInputSchema>

const EnrichContactOutputSchema = EnrichContactInputSchema.extend({
  'Contact First Name': z.string(),
  'Contact Last Name': z.string(),
  'Contact Title': z.string(),
  'Contact Email': z.string(),
})
type EnrichContactOutput = z.infer<typeof EnrichContactOutputSchema>

export class EnrichContactStage implements PipelineStage<EnrichContactInput, EnrichContactOutput> {
  name = 'Enrich contact information for best contact in Apollo'

  async process(input: EnrichContactInput, context: PipelineContext): Promise<EnrichContactOutput> {
    EnrichContactInputSchema.parse(input)
    const data = await getPeopleEnrichment(input.bestContactId)
    context.tracker.incrementApolloCalls()
    context.tracker.incrementEnrichments()

    return {
      ...input,
      'Contact First Name': data.person.first_name,
      'Contact Last Name': data.person.last_name,
      'Contact Title': data.person.title,
      'Contact Email': data.person.email
    }
  }
}
