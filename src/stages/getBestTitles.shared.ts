import z from "zod";
import type { PipelineContext, PipelineStage } from "../pipeline.js";

const BestTitlesInputSchema = z.object({
  'Company Type': z.string(),
})
type BestTitlesInput = z.infer<typeof BestTitlesInputSchema>

const BestTitlesOutputSchema = BestTitlesInputSchema.extend({
  'Best Titles': z.array(z.string())
})
type BestTitlesOutput = z.infer<typeof BestTitlesOutputSchema>

export class GetBestTitlesStage implements PipelineStage<BestTitlesInput, BestTitlesOutput> {
  name = 'Get best titles for people at company given a specific company type'

  async process(input: BestTitlesInput, context: PipelineContext): Promise<BestTitlesOutput> {
    BestTitlesInputSchema.parse(input)

    const titleMap: { [key: string]: string[] } = {
      Lender: ['VP of Operations', 'Head of Operations', 'Director of Operations', 'Chief Operating Officer', 'VP of Lending', 'Head of Lending', 'Director of Lending', 'Chief Lending Officer'],
      LendTech: ['Chief Technology Officer', 'VP of Engineering', 'Head of Engineering', 'Founder', 'Co-Founder', 'Chief Executive Officer', 'CEO'],
    }

    if (!(input['Company Type'] in titleMap)) {
      if (context.config.titlesToSearch.length) {
        return { ...input, 'Best Titles': context.config.titlesToSearch }
      }

      context.throwError(`Company type ${input['Company Type']} not recognized. Valid types are: ${Object.keys(titleMap).join(', ')}`)
    }

    return { ...input, 'Best Titles': titleMap[input['Company Type']] ?? [] }
  }
}
