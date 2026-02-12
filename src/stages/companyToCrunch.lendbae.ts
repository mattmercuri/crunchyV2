import z from "zod"
import type { PipelineContext, PipelineStage } from "../pipeline.js"

export const CompanyInputSchema = z.object({
  'Company Name': z.string(),
  'Company Name for Emails': z.string(),
  'Website': z.string(),
  'Company City': z.string(),
  'SIC Codes': z.string(),
  'NAICS Codes': z.string(),
  'Short Description': z.string()
})
export type CompanyInput = z.infer<typeof CompanyInputSchema>

const CompanyToCrunchSchema = CompanyInputSchema.transform((input) => ({
  ...input,
  'Organization Name': input['Company Name for Emails'],
  'Headquarters Location': input['Company City']
}))
export type CompanyToCrunchOutput = z.output<typeof CompanyToCrunchSchema>

export class CompanyToCrunchStage implements PipelineStage<CompanyInput, CompanyToCrunchOutput> {
  name = 'Normalize input for Crunchy stages'

  process(input: CompanyInput, context: PipelineContext): CompanyToCrunchOutput {
    const totalProcessed = context.tracker.errors + context.tracker.enrichments
    context.logger.info(`(${totalProcessed + 1}/${context.config.totalRows}) Starting enrichment for ${input['Company Name for Emails']}...`)
    return CompanyToCrunchSchema.parse(input)
  }
}
