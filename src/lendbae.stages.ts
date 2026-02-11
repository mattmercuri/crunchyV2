import z from "zod";
import type { PipelineContext, PipelineStage } from "./index.js";
import { getLendingCompanyType, type LendingCompanyConfig } from "./services/openai.js";

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
  'Company Type': z.enum(LENDING_COMPANY_TYPES)
})
type CompanyTypeOutput = z.infer<typeof CompanyTypeOutputSchema>

export class GetLendingCompanyType implements PipelineStage<CompanyTypeInput, CompanyTypeOutput> {
  name = 'Classify appropriate lending company type'

  async process(input: CompanyTypeInput, context: PipelineContext): Promise<CompanyTypeOutput> {
    const llmSystemPrompt = ``
    const llmUserPrompt = ``
    const llmConfig: LendingCompanyConfig = {
      model: "gpt-5-mini-2025-08-07",
      systemPrompt: llmSystemPrompt,
      outputFormat: z.object({
        companyType: z.enum(LENDING_COMPANY_TYPES)
      })
    }

    const companyType = await getLendingCompanyType(llmUserPrompt, llmConfig)
    context.tracker.incrementOpenAiCalls()

    return {
      ...input,
      'Company Type': String(companyType) ?? ''
    }
  }
}
