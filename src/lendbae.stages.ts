import z from "zod";
import type { PipelineContext, PipelineStage } from "./index.js";
import { getCompanyType, type CompanyTypeConfig } from "./services/openai.js";

const COMPANY_TYPES = {
  'LendTech': 'A company that provides technology solutions to lenders, such as software platforms, data analytics, loan management systems, loan origination software, etc.',
  'Lender': 'A company that provides or brokers loans or credit to individuals or businesses. This could include banks, credit unions, online lenders, peer-to-peer lending platforms, etc.',
  'Neither': 'A company that does not fit the definition of either a LendTech or a Lender. This could include companies in other industries or sectors that do not provide technology solutions to lenders or offer loans/credit.',
  'Unsure': 'If you are unsure about the classification of the company based on the provided information, you can select this option. It indicates that there is not enough information to confidently classify the company as either a LendTech or a Lender.'
}

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
  'Company Type': z.enum(COMPANY_TYPES)
})
type CompanyTypeOutput = z.infer<typeof CompanyTypeOutputSchema>

export class GetCompanyType implements PipelineStage<CompanyTypeInput, CompanyTypeOutput> {
  name = 'Classify appropriate company type'

  async process(input: CompanyTypeInput, context: PipelineContext): Promise<CompanyTypeOutput> {
    const llmSystemPrompt = `You are a business analyst that specializes in classifying companies. You are given key pieces of information about a company to decide what type of company you are assessing. The user will provide their own company types for categorization. You will likely receive the following information:
    - Company Name
    - Website
    - Company City
    - SIC Codes
    - NAICS Codes
    - Short Description

    Use all of the above information when making your classification. If you lack sufficient information, feel free to perform a web search to research the company further.

    When confident in your assessment, respond with the best-fitting company type.`

    const llmUserPrompt = `
    I am looking for you to classify my company with one of the following types: ${Object.keys(COMPANY_TYPES).join(', ')}. Here is the information I have about my company:
    - Company Name: ${input['Company Name']}
    - Website: ${input['Website']}
    - Company City: ${input['Company City']}
    - SIC Codes: ${input['SIC Codes']}
    - NAICS Codes: ${input['NAICS Codes']}
    - Short Description: ${input['Short Description']}

    Here is a detailed description of the company types that I have provided for you to use in your classification:
    ${Object.entries(COMPANY_TYPES).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

    What type of company is this?`

    const llmConfig: CompanyTypeConfig = {
      model: "gpt-5-mini-2025-08-07",
      systemPrompt: llmSystemPrompt,
      outputFormat: z.object({
        companyType: z.enum(Object.keys(COMPANY_TYPES))
      })
    }

    const companyType = await getCompanyType(llmUserPrompt, llmConfig)
    context.tracker.incrementOpenAiCalls()

    return {
      ...input,
      'Company Type': String(companyType) ?? ''
    }
  }
}
