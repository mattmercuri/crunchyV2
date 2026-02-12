import z from "zod";
import type { PipelineContext, PipelineStage } from "../pipeline.js";

// TODO: Adjust to not use looseObject
const BestTitlesInputSchema = z.looseObject({
  'Company Type': z.string().optional(),
})
type BestTitlesInput = z.infer<typeof BestTitlesInputSchema>

const BestTitlesOutputSchema = BestTitlesInputSchema.extend({
  'Best Titles': z.array(z.string())
})
type BestTitlesOutput = z.infer<typeof BestTitlesOutputSchema>

export class GetBestTitlesStage implements PipelineStage<BestTitlesInput, BestTitlesOutput> {
  name = 'Get best titles for people at company given a specific company type'

  async process(input: BestTitlesInput, context: PipelineContext): Promise<BestTitlesOutput> {
    const parsedInput = BestTitlesInputSchema.parse(input)
    const companyType = parsedInput['Company Type']?.trim()

    if (!companyType) {
      if (context.config.titlesToSearch.length) {
        return { ...parsedInput, 'Best Titles': context.config.titlesToSearch }
      }

      context.throwError('Company type is missing from input and no default titles provided in config')
    }

    const titleMap: { [key: string]: string[] } = {
      Lender: ['VP of Operations', 'Head of Operations', 'Director of Operations', 'Chief Operating Officer', 'VP of Lending', 'Head of Lending', 'Director of Lending', 'Chief Lending Officer'],
      LendTech: ['Chief Technology Officer', 'VP of Engineering', 'Head of Engineering', 'Founder', 'Co-Founder', 'Chief Executive Officer', 'CEO'],
    }

    if (!(companyType in titleMap)) {
      context.throwError(`Company type ${companyType} not recognized. Valid types are: ${Object.keys(titleMap).join(', ')}`)
    }

    return { ...parsedInput, 'Best Titles': titleMap[companyType] ?? [] }
  }
}
