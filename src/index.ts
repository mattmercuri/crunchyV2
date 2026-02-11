import z from "zod";
import { getInputFromCsv, writeToCsv } from "./services/csv.js";
import type { RaiseSegment } from "./crunchy.config.js";
import crunchyConfig from "./crunchy.config.js";
import { CompanyInputSchema, type CompanyInput } from "./stages/companyToCrunch.lendbae.js";
import { CompanyToCrunchStage, EnrichContactStage, GetBestContactStage, GetCompanyTypeStage, GetOrganizationStage, GetPeopleStage, LendBaePostProcessStage, PostProcessStage, PreProcessStage } from "./stages/index.js";
import { LendBaePostProcessOutputSchema, type LendBaePostProcessOutput } from "./stages/postProcess.lendbae.js";
import { Pipeline, RunLogger, RunTracker, type PipelineContext } from "./pipeline.js";

/**
 * TODO:
 * - Fix ESLINT config
 * - Validate input
 * - Validate output
 * - Use CSV rows for calculation help
 * - Fix errors for individual rows
 * - Add API calls to logs
 */

/**
 * NOTES:
 * - Don't like the reliance on a specific zod schema (the extends) as it
 * makes it so the stages cannot be independent of workflow (or reordered)
 * - Don't like how I have to first parse raw data with Zod
 */

const InputSchema = z.object({
  'Organization Name': z.string(),
  'Organization Name URL': z.string().nullable(),
  'Last Funding Date': z.coerce.string(),
  'Last Funding Type': z.string(),
  'Number of Employees': z.string(),
  'Headquarters Location': z.string(),
  'Description': z.string().nullable(),
  'Last Funding Amount': z.coerce.number(),
  'Last Funding Amount Currency': z.string(),
  'Last Funding Amount (in USD)': z.coerce.number(),
  'Lead Investors': z.string().nullable(),
  'Website': z.string()
});
type Input = z.infer<typeof InputSchema>

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

async function runCrunchyWithLocalCsv(inputRelativePath: string, segment: RaiseSegment) {
  const { rows, totalRows } = await getInputFromCsv(inputRelativePath, InputSchema)

  const cleanedRows: Input[] = []
  rows.forEach((row) => {
    const { success, data } = z.safeParse(InputSchema, row)
    if (success) {
      cleanedRows.push(data)
    }
  })

  const context: PipelineContext = {
    logger: new RunLogger(),
    tracker: new RunTracker(),
    throwError: (message: string) => {
      throw new Error(message)
    },
    config: {
      titlesToSearch: crunchyConfig.bestTitle.titlePriorities[segment],
      options: crunchyConfig.options[segment],
      totalRows
    }
  }

  const pipeline = Pipeline.create<Input>()
    .pipe(new PreProcessStage())
    .pipe(new GetOrganizationStage())
    .pipe(new GetPeopleStage())
    .pipe(new GetBestContactStage())
    .pipe(new EnrichContactStage())
    .pipe(new PostProcessStage())

  const completedRows: Output[] = []
  for (const row of cleanedRows) {
    try {
      const result = await pipeline.run(row, context)
      completedRows.push(result)
    } catch (err) {
      if (err instanceof Error) {
        context.logger.error(`PIPELINE ERROR - ${err.message}`)
      } else {
        context.logger.error('Unknown Pipeline Error')
      }
    }
  }

  const validatedFinalRows: Output[] = []
  completedRows.forEach(completedRow => {
    const { success, data } = z.safeParse(OutputSchema, completedRow)
    if (success) {
      validatedFinalRows.push(data)
    }
  })

  context.tracker.logSummaryStats()

  const timestamp = new Date().toISOString();
  writeToCsv(`PROCESSED_${timestamp}_${inputRelativePath}`, validatedFinalRows)
}

async function runLendbaeWithLocalCsv(inputRelativePath: string) {
  const { rows, totalRows } = await getInputFromCsv(inputRelativePath, CompanyInputSchema)

  const cleanedRows: CompanyInput[] = []
  rows.forEach((row) => {
    const { success, data } = z.safeParse(CompanyInputSchema, row)
    if (success) {
      cleanedRows.push(data)
    }
  })

  const context: PipelineContext = {
    logger: new RunLogger(),
    tracker: new RunTracker(),
    throwError: (message: string) => {
      throw new Error(message)
    },
    config: {
      titlesToSearch: ['VP Operations', 'Vice President Operations', 'Head of Operations', 'Operations Manager'],
      options: crunchyConfig.options['ALarge'], // Not actually used,
      totalRows
    }
  }

  const pipeline = Pipeline.create<CompanyInput>()
    .pipe(new CompanyToCrunchStage())
    .pipe(new GetCompanyTypeStage())
    .pipe(new GetOrganizationStage())
    .pipe(new GetPeopleStage())
    .pipe(new GetBestContactStage())
    .pipe(new EnrichContactStage())
    .pipe(new LendBaePostProcessStage())

  const completedRows: LendBaePostProcessOutput[] = []
  for (const row of cleanedRows) {
    try {
      const result = await pipeline.run(row, context)
      completedRows.push(result)
    } catch (err) {
      if (err instanceof Error) {
        context.logger.error(`PIPELINE ERROR - ${err.message}`)
      } else {
        context.logger.error('Unknown Pipeline Error')
      }
    }
  }

  const validatedFinalRows: LendBaePostProcessOutput[] = []
  completedRows.forEach(completedRow => {
    const { success, data } = z.safeParse(LendBaePostProcessOutputSchema, completedRow)
    if (success) {
      validatedFinalRows.push(data)
    }
  })

  context.tracker.logSummaryStats()

  const timestamp = new Date().toISOString();
  writeToCsv(`PROCESSED_${timestamp}_${inputRelativePath}`, validatedFinalRows)
}


async function main() {
  // runCrunchyWithLocalCsv('Crunchy2026JanuaryBCCS.csv', 'BCCS')
  runLendbaeWithLocalCsv('LendBae_Sample.csv')
}

main()
