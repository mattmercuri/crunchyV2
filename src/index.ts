import z from "zod";
import { getOrganization, getPeople, type OrganizationSearchAPIResponse, type PeopleSearchAPIResponse } from "./services/apollo.js";
import { getDomain } from "./services/domains.js";
import { getBestTitle } from "./services/openai.js";

/**
 * TODO:
 * - Fix ESLINT config
 * - Validate input
 * - Validate output
 */

/**
 * NOTES:
 * - Don't like the reliance on a specific zod schema (the extends) as it
 * makes it so the stages cannot be independent of workflow (or reordered)
 * - Don't like how I have to first parse raw data with Zod
 */

interface Logger {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

interface Tracker {
  enrichments: number;
  errors: number;
  apolloCalls: number;
  openAiCalls: number;
  incrementEnrichments(): void;
  incrementErrors(): void;
  incrementApolloCalls(): void;
  incrementOpenAiCalls(): void;
  logSummaryStats(): void;
}

interface PipelineContext {
  logger: Logger;
  tracker: Tracker;
  throwError(message: string): never;
  titlesToSearch: string[]
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
  enrichments: number = 0;
  errors: number = 0;
  apolloCalls: number = 0;
  openAiCalls: number = 0;

  incrementEnrichments(): void {
    this.enrichments++
  }

  incrementErrors(): void {
    this.errors++
  }

  incrementApolloCalls(): void {
    this.apolloCalls++
  }

  incrementOpenAiCalls(): void {
    this.openAiCalls++
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

type Input = z.infer<typeof InputSchema>

class PreProcessStage implements PipelineStage<Input, Input> {
  name = 'Remove rows with insufficient data'

  process(input: Input, _: PipelineContext): Input {
    const validatedInput = InputSchema.parse(input)
    return validatedInput
  }
}

const OrganizationOutputSchema = InputSchema.extend({
  organizationId: z.string()
});
type OrganizationOutput = z.infer<typeof OrganizationOutputSchema>

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
    context.tracker.incrementApolloCalls()
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
    context.tracker.incrementApolloCalls()
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
    context.tracker.incrementApolloCalls()

    if (!organizationId) context.throwError('Could not find organization in Apollo')

    return {
      ...input,
      organizationId
    }
  }
}

const GetPeopleOutputSchema = OrganizationOutputSchema.extend({
  people: z.array(z.object({
    id: z.string(),
    first_name: z.string(),
    last_name_obfuscated: z.string(),
    title: z.string(),
    has_email: z.boolean(),
    last_refreshed_at: z.string()
  }))
})
type GetPeopleOutput = z.infer<typeof GetPeopleOutputSchema>

class GetPeopleStage implements PipelineStage<OrganizationOutput, GetPeopleOutput> {
  name = 'Get contacts for organization in Apollo'

  async process(input: OrganizationOutput, context: PipelineContext): Promise<GetPeopleOutput> {
    let peopleData
    peopleData = await getPeople(input.organizationId, context.titlesToSearch)
    context.tracker.incrementApolloCalls()

    if (!peopleData || peopleData.total_entries <= 0 || !peopleData.people.length) {
      peopleData = await getPeople(input.organizationId, [], true)
      context.tracker.incrementApolloCalls()
    }

    if (!peopleData || peopleData.total_entries <= 0 || !peopleData.people.length) {
      context.throwError(`Could not find anyone in apollo for ${input["Organization Name"]}`)
    }

    return {
      ...input,
      people: peopleData.people
    }
  }
}

const GetBestContactOutputSchema = GetPeopleOutputSchema.extend({
  bestContactId: z.string()
})
type GetBestContactOutput = z.infer<typeof GetBestContactOutputSchema>

async function getBestContactWithLlm(returnedPeople: PeopleSearchAPIResponse['people'], titlesToSearch: string[]) {
  const returnedTitles = returnedPeople.map(person => person.title);
  const bestTitle = await getBestTitle(returnedTitles, titlesToSearch);

  if (!bestTitle) return;

  const match = returnedPeople.find(person => person.title.trim().toUpperCase() === bestTitle.trim().toUpperCase());
  return match;
}


class GetBestContactStage implements PipelineStage<GetPeopleOutput, GetBestContactOutput> {
  name = 'Get best contact from Apollo (just ID)'

  async process(input: GetPeopleOutput, context: PipelineContext): Promise<GetBestContactOutput> {
    let bestContactId

    // FIRST: Select solo option if there is only one
    if (input.people.length === 1) {
      bestContactId = input.people[0]?.id

      if (!bestContactId) {
        context.throwError(`Cannot extract singular best contact for ${input["Organization Name"]} - ${JSON.stringify(input.people)}`)
      }

      return {
        ...input,
        bestContactId
      }
    }

    // SECOND: Try to match exactly the correct title to the returned people (in priority sequence)
    for (const title of context.titlesToSearch) {
      const match = input.people.find(
        person => person.title.trim().toUpperCase() === title.trim().toUpperCase()
      );
      if (match && match.id) {
        return {
          ...input,
          bestContactId: match.id
        }
      }
    }

    // THIRD: Enlist help of OpenAI to match best fitting title
    const bestContact = await getBestContactWithLlm(input.people, context.titlesToSearch);

    if (!bestContact || !bestContact.id) {
      context.throwError(`Could not find an appropriate contact at ${input["Organization Name"]}`)
    }

    return {
      ...input,
      bestContactId: bestContact.id
    }
  }
}

export async function runCrunchy() {
  const pipeline = Pipeline.create<Input>()
    .pipe(new PreProcessStage())
    .pipe(new GetOrganizationStage())
    .pipe(new GetPeopleStage())
    .pipe(new GetBestContactStage())

  // const rows = []

  const context: PipelineContext = {
    logger: new RunLogger(),
    tracker: new RunTracker(),
    throwError: (message: string) => {
      throw new Error(message)
    },
    // TODO: Update to pull from config
    titlesToSearch: ['test', 'test']
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
