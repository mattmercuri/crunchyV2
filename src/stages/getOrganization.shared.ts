import z from "zod"
import { getOrganization, type OrganizationSearchAPIResponse } from "../services/apollo.js"
import { getDomain } from "../services/domains.js"
import type { PipelineContext, PipelineStage } from "../pipeline.js"

const GetOrganizationInputSchema = z.object({
  'Organization Name': z.string(),
  'Headquarters Location': z.string(),
  'Website': z.string()
})
type GetOrganizationInput = z.infer<typeof GetOrganizationInputSchema>

const GetOrganizationOutputSchema = GetOrganizationInputSchema.extend({
  organizationId: z.string()
})
type GetOrganizationOutput = z.infer<typeof GetOrganizationOutputSchema>

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

export class GetOrganizationStage implements PipelineStage<GetOrganizationInput, GetOrganizationOutput> {
  name = 'Get Apollo Organization ID'

  async process(input: GetOrganizationInput, context: PipelineContext): Promise<GetOrganizationOutput> {
    GetOrganizationInputSchema.parse(input)
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
