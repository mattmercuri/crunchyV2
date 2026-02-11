import z from "zod"
import type { PipelineContext, PipelineStage } from "../index.js"

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

  process(input: CompanyInput, _: PipelineContext): CompanyToCrunchOutput {
    return CompanyToCrunchSchema.parse(input)
  }
}
