import z from "zod"
import type { PipelineContext, PipelineStage } from "../index.js"
import { formatFundingAmount, formatLeadInvestor, lowercaseFirst } from "../services/utils.js"

const PostProcessInputSchema = z.object({
  'Organization Name': z.string(),
  'Last Funding Amount (in USD)': z.coerce.number(),
  'Last Funding Type': z.string(),
  'Website': z.string(),
  'Contact First Name': z.string(),
  'Contact Last Name': z.string(),
  'Contact Title': z.string(),
  'Contact Email': z.string(),
  'Lead Investors': z.string().nullable()
})
type PostProcessInput = z.infer<typeof PostProcessInputSchema>

const OutputSchema = z.object({
  'Company Name': z.string(),
  'Funding': z.string(),
  'Funding Type': z.string(),
  'Website': z.string(),
  'Contact First Name': z.string(),
  'Contact Last Name': z.string(),
  'Contact Title': z.string(),
  'Contact Email': z.string(),
  'Lead Investor': z.string().nullish()
})
type Output = z.infer<typeof OutputSchema>

export class PostProcessStage implements PipelineStage<PostProcessInput, Output> {
  name = 'Post process data'

  process(input: PostProcessInput, _: PipelineContext): Output {
    PostProcessInputSchema.parse(input)
    return {
      'Company Name': input['Organization Name'],
      'Funding': formatFundingAmount(input['Last Funding Amount (in USD)']),
      'Funding Type': lowercaseFirst(input['Last Funding Type']),
      'Website': input.Website,
      'Contact First Name': input['Contact First Name'],
      'Contact Last Name': input['Contact Last Name'],
      'Contact Title': input['Contact Title'],
      'Contact Email': input['Contact Email'],
      'Lead Investor': formatLeadInvestor(input['Lead Investors'] ?? '')
    }
  }
}
