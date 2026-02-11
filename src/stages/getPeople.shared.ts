import z from "zod"
import type { PipelineContext, PipelineStage } from "../pipeline.js"
import { getPeople } from "../services/apollo.js"

const GetPeopleInputSchema = z.object({
  'Organization Name': z.string(),
  organizationId: z.string()
})
type GetPeopleInput = z.infer<typeof GetPeopleInputSchema>

const GetPeopleOutputSchema = GetPeopleInputSchema.extend({
  people: z.array(z.object({
    id: z.string(),
    first_name: z.string(),
    last_name_obfuscated: z.string(),
    title: z.string(),
    has_email: z.boolean(),
    last_refreshed_at: z.string()
  }))
})
type GetPeopleOutput = z.infer<typeof GetPeopleOutputSchema>

export class GetPeopleStage implements PipelineStage<GetPeopleInput, GetPeopleOutput> {
  name = 'Get contacts for organization in Apollo'

  async process(input: GetPeopleInput, context: PipelineContext): Promise<GetPeopleOutput> {
    GetPeopleInputSchema.parse(input)
    let peopleData
    peopleData = await getPeople(input.organizationId, context.config.titlesToSearch)
    context.tracker.incrementApolloCalls()
    peopleData = peopleData.people.filter(person => person.has_email)

    if (!peopleData.length) {
      peopleData = await getPeople(input.organizationId, [], true)
      context.tracker.incrementApolloCalls()
      peopleData = peopleData.people.filter(person => person.has_email)
    }

    if (!peopleData.length) {
      context.throwError(`Could not find anyone in Apollo for ${input["Organization Name"]}`)
    }

    return {
      ...input,
      people: peopleData
    }
  }
}
