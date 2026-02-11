import z from "zod"
import { CompanyInputSchema, COMPANY_TYPES } from "./getCompanyType.lendbae.js"
import type { PipelineContext, PipelineStage } from "../pipeline.js"

export const LendBaePostProcessOutputSchema = CompanyInputSchema.extend({
  'Company Type': z.enum(Object.keys(COMPANY_TYPES)),
  'Contact First Name': z.string(),
  'Contact Last Name': z.string(),
  'Contact Title': z.string(),
  'Contact Email': z.string()
})
export type LendBaePostProcessOutput = z.infer<typeof LendBaePostProcessOutputSchema>

export class LendBaePostProcessStage implements PipelineStage<LendBaePostProcessOutput, LendBaePostProcessOutput> {
  name = 'Finalize output for LendBae'

  process(input: LendBaePostProcessOutput, _: PipelineContext): LendBaePostProcessOutput {
    return LendBaePostProcessOutputSchema.parse({
      'Company Name': input['Company Name'],
      'Company Name for Emails': input['Company Name for Emails'],
      'Website': input['Website'],
      'Company City': input['Company City'],
      'SIC Codes': input['SIC Codes'],
      'NAICS Codes': input['NAICS Codes'],
      'Short Description': input['Short Description'],
      'Company Type': input['Company Type'],
      'Contact First Name': input['Contact First Name'],
      'Contact Last Name': input['Contact Last Name'],
      'Contact Title': input['Contact Title'],
      'Contact Email': input['Contact Email']
    })
  }
}
