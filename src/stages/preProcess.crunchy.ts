import z from "zod"
import type { PipelineContext, PipelineStage } from "../index.js"

const PreProcessInputSchema = z.object({
  'Organization Name': z.string(),
  'Last Funding Amount': z.coerce.number(),
  'Lead Investors': z.string().nullable(),
  'Website': z.string()
})
type PreProcessInput = z.infer<typeof PreProcessInputSchema>
type PreProcessOutput = PreProcessInput

export class PreProcessStage implements PipelineStage<PreProcessInput, PreProcessOutput> {
  name = 'Remove rows with insufficient data'

  process(input: PreProcessInput, context: PipelineContext): PreProcessOutput {
    PreProcessInputSchema.parse(input)
    const totalProcessed = context.tracker.errors + context.tracker.enrichments
    context.logger.info(`(${totalProcessed + 1}/${context.config.totalRows}) Starting enrichment for ${input["Organization Name"]}...`)

    if (context.config.options.needsFundingAmount && input["Last Funding Amount"] <= 0) {
      context.throwError(`Omitting ${input["Organization Name"]} - no funding amount`)
    }

    if (context.config.options.needsLeadInvestor && (!input['Lead Investors'] || input['Lead Investors'] === '')) {
      context.throwError(`Omitting ${input["Organization Name"]} - no lead investors`)
    }

    if (input['Website'] === '' || !input['Website']) {
      context.throwError(`Omitting ${input["Organization Name"]} - no website`)
    }

    return input
  }
}
