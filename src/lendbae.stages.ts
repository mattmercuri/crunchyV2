import z from "zod";
import type { PipelineContext, PipelineStage } from "./index.js";

const LENDING_COMPANY_TYPES = ['LendTech', 'Lender', 'Neither', 'Unsure']

const CompanyTypeInputSchema = z.object({
  'Company Name': z.string(),
  'Website': z.string(),
  'Company City': z.string(),
  'SIC Codes': z.string(),
  'NAICS Codes': z.string(),
  'Short Description': z.string()
})

type CompanyTypeInput = z.infer<typeof CompanyTypeInputSchema>

const CompanyTypeOutputSchema = CompanyTypeInputSchema.extend({
  'Comany Type': z.enum(LENDING_COMPANY_TYPES)
})
type CompanyTypeOutput = z.infer<typeof CompanyTypeOutputSchema>

class GetLendingCompanyType implements PipelineStage<CompanyTypeInput, CompanyTypeOutput> {
  name = 'Classify appropriate lending company type'

  process(input: CompanyTypeInput, content: PipelineContext): CompanyTypeOutput {

  }
}