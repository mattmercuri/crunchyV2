import z from "zod";
import { getOrganization, type OrganizationSearchAPIResponse } from "./services/apollo.js";
import { getDomain } from "./services/domains.js";

/**
 * TODO:
 * -
 */

interface Logger {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

interface Tracker {
  successes: number;
  errors: number;
  apolloCredits: number;
  incrementEnrichments(): void;
  incrementErrors(): void;
  incrementApolloCredits(): void;
  logSummaryStats(): void;
}

interface PipelineContext {
  logger: Logger;
  tracker: Tracker;
  throwError(message: string): never;
}

interface PipelineStage<InputSchema, OutputSchema> {
  name: string;
  process(input: InputSchema, context: PipelineContext): Promise<OutputSchema> | OutputSchema
}

class RunLogger implements Logger {
  info(message: string): void {
    console.log(`[INFO] ${message}`)
  }

  warn(message: string): void {
    console.warn(`[WARN] ${message}`)
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`)
  }
}

class RunTracker implements Tracker {
  successes: number = 0;
  errors: number = 0;
  apolloCredits: number = 0;

  incrementEnrichments(): void {
    this.successes++
  }

  incrementErrors(): void {
    this.errors++
  }

  incrementApolloCredits(): void {
    this.apolloCredits++
  }

  logSummaryStats(): void {
    return
  }
}

class Pipeline<InitialInput, CurrentOutput> {
  private constructor(
    private readonly steps: PipelineStage<any, any>[] = []
  ) { }

  static create<T>(): Pipeline<T, T> {
    return new Pipeline([])
  }

  pipe<Next>(
    stage: PipelineStage<CurrentOutput, Next>
  ): Pipeline<InitialInput, Next> {
    return new Pipeline([...this.steps, stage])
  }

  async run(input: InitialInput, context: PipelineContext): Promise<CurrentOutput> {
    let currentData: any = input

    for (const stage of this.steps) {
      try {
        currentData = await stage.process(currentData, context)
        context.tracker.incrementEnrichments()
      } catch (err) {
        context.tracker.incrementErrors()
        if (err instanceof Error) {
          context.logger.error(err.message)
        } else {
          context.logger.error(`Unknown error occured: ${JSON.stringify(err, null, 2)}`)
        }
      }
    }

    return currentData
  }
}

const InputSchema = z.strictObject({
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

const OrganizationOutput = InputSchema.extend({
  organizationId: z.string()
});

type Input = z.infer<typeof InputSchema>
type OrganizationOutput = z.infer<typeof OrganizationOutput>

function selectOrganizationFromDomain(
  organizations: OrganizationSearchAPIResponse['organizations'],
  accounts: OrganizationSearchAPIResponse['accounts'],
  domain: string
) {
  let match

  if (accounts.length) {
    match = accounts.find(account => getDomain(account.website_url ?? '') === domain)
    if (!match) {
      match = accounts.find(account => account.primary_domain === domain)
    }
  }

  if (match) return match.organization_id
  if (!organizations.length) return

  match = organizations.find(organization => getDomain(organization.website_url ?? '') === domain)
  if (!match) {
    match = organizations.find(organization => organization.primary_domain === domain)
  }

  if (!match) return

  return match.id
}

class GetOrganizationStage implements PipelineStage<Input, OrganizationOutput> {
  name = 'Get Apollo Organization ID'

  async process(input: Input, context: PipelineContext): Promise<OrganizationOutput> {
    let data
    let organizationId

    // FIRST: Try by only website search
    const companyDomain = getDomain(input.Website)
    if (!companyDomain) {
      context.throwError(`Could not extract company domain for ${input["Organization Name"]}`)
    }

    data = await getOrganization({ websiteDomains: [companyDomain] })
    context.tracker.incrementApolloCredits()
    organizationId = selectOrganizationFromDomain(data.organizations, data.accounts, companyDomain)

    if (organizationId) {
      return {
        ...input,
        organizationId
      }
    }

    // SECOND: Try by name and location and check with website (still validating website like above)
    const primaryLocation = input["Headquarters Location"].split(',').map(s => s.trim())[0] ?? ''
    data = await getOrganization({ name: input["Organization Name"], locations: [primaryLocation] })
    context.tracker.incrementApolloCredits()
    organizationId = selectOrganizationFromDomain(data.organizations, data.accounts, companyDomain)

    if (organizationId) {
      return {
        ...input,
        organizationId
      }
    }

    // THIRD: Select first response in account (if present), else organization
    organizationId = data.accounts[0]?.organization_id ?? data.organizations[0]?.id ?? ''
    if (organizationId) {
      return {
        ...input,
        organizationId
      }
    }

    // FOURTH: Select first response in account (if present), else organization W/O location in call
    data = await getOrganization({ name: input["Organization Name"] })
    organizationId = data.accounts[0]?.organization_id ?? data.organizations[0]?.id ?? ''
    context.tracker.incrementApolloCredits()

    if (!organizationId) context.throwError('Could not find organization in Apollo')

    return {
      ...input,
      organizationId
    }
  }
}

class PreProcessStage implements PipelineStage<Input, Input> {
  name = 'Remove rows with insufficient data'

  process(input: Input, _: PipelineContext): Input {
    const validatedInput = InputSchema.parse(input)
    return validatedInput
  }
}

export async function runCrunchy() {
  const pipeline = Pipeline.create<Input>()
    .pipe(new PreProcessStage())
    .pipe(new GetOrganizationStage())

  // const rows = []

  const context: PipelineContext = {
    logger: new RunLogger(),
    tracker: new RunTracker(),
    throwError: (message: string) => {
      throw new Error(message)
    }
  }

  // for (const row of rows) {
  //   try {
  //     const result = await pipeline.run(row, context)
  //     console.log("Success:", result);
  //   } catch (err) {
  //     if (err instanceof Error) {
  //       context.logger.error(`PIPELINE ERROR - ${err.message}`)
  //     } else {
  //       context.logger.error('Unknown Pipeline Error')
  //     }
  //   }
  // }
}

async function main() {
  runCrunchy()
}

main()