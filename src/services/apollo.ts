import { z } from 'zod';
import config from '../environment.config.js';

const OrganizationSearchAPIResponseSchema = z.object({
  accounts: z.array(
    z.object({
      name: z.string(),
      website_url: z.string().nullable(),
      primary_domain: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      country: z.string().nullable(),
      organization_id: z.string().nullable(),
      organization_city: z.string().nullable(),
      organization_state: z.string().nullable(),
      organization_country: z.string().nullable(),
    }),
  ),
  organizations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      website_url: z.string().nullable(),
      primary_domain: z.string().nullable(),
    }),
  ),
});

export type OrganizationSearchAPIResponse = z.infer<
  typeof OrganizationSearchAPIResponseSchema
>;

const PeopleSearchAPIResponseSchema = z.object({
  total_entries: z.number(),
  people: z.array(
    z.object({
      id: z.string(),
      first_name: z.string(),
      last_name_obfuscated: z.string(),
      title: z.string(),
      has_email: z.boolean(),
      last_refreshed_at: z.string(),
    }),
  ),
});

export type PeopleSearchAPIResponse = z.infer<typeof PeopleSearchAPIResponseSchema>;

const PeopleEnrichmentAPIResponseSchema = z.object({
  person: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    name: z.string(),
    title: z.string(),
    email: z.string(),
    email_status: z.string().nullable(),
    extrapolated_email_confidence: z.string().nullable(),
    headline: z.string().nullable(),
    linkedin_url: z.string().nullable(),
    organization_id: z.string().nullable(),
  }),
});

const baseHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
  'X-Api-Key': config.apollo.APOLLO_API_KEY,
};

type OrganizationSearchOptions = {
  name?: string;
  locations?: string[] | undefined;
  websiteDomains?: string[] | undefined;
};

export async function getOrganization(options?: OrganizationSearchOptions) {
  const base = new URL(config.apollo.baseApiUrl + '/mixed_companies/search');

  if (options?.name) {
    base.searchParams.set('q_organization_name', options.name);
  }

  if (options?.locations?.length) {
    options.locations.forEach((location) =>
      base.searchParams.append('organization_locations[]', location),
    );
  }

  if (options?.websiteDomains?.length) {
    options.websiteDomains.forEach((domain) =>
      base.searchParams.append('q_organization_domains_list[]', domain),
    );
  }

  const res = await fetch(base.toString(), {
    method: 'POST',
    headers: baseHeaders,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Request to getOrganization failed ${res.status} ${res.statusText}: ${text}`,
    );
  }

  const rawData = await res.json();
  const data = OrganizationSearchAPIResponseSchema.parse(rawData);

  return data;
}

export async function getPeople(
  organizationId: string,
  titles?: string[],
  shouldIncludeSeniority: boolean = false,
  shouldIncludeSimilarTitles: boolean = true,
) {
  const base = new URL(config.apollo.baseApiUrl + '/mixed_people/api_search');
  base.searchParams.set('organization_ids[]', organizationId);
  base.searchParams.set('include_similar_titles', String(shouldIncludeSimilarTitles));

  if (titles?.length) {
    titles.forEach((title) => base.searchParams.append('person_titles[]', title));
  }

  if (shouldIncludeSeniority) {
    const seniorities = [
      'owner',
      'founder',
      'c_suite',
      'partner',
      'vp',
      'head',
      'director',
    ];
    seniorities.forEach((seniority) =>
      base.searchParams.set('person_seniorities[]', seniority),
    );
  }

  const res = await fetch(base.toString(), {
    method: 'POST',
    headers: baseHeaders,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Request to getPeople failed ${res.status} ${res.statusText}: ${text}`,
    );
  }

  const rawData = await res.json();
  const data = PeopleSearchAPIResponseSchema.parse(rawData);

  return data;
}

export async function getPeopleEnrichment(id: string) {
  const base = new URL(config.apollo.baseApiUrl + '/people/match');
  base.searchParams.set('id', id);
  base.searchParams.set('reveal_personal_emails', 'true');

  const res = await fetch(base.toString(), {
    method: 'POST',
    headers: baseHeaders,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Request to getPeopleEnrichment failed ${res.status} ${res.statusText}: ${text}`,
    );
  }

  const rawData = await res.json();
  const data = PeopleEnrichmentAPIResponseSchema.parse(rawData);

  return data;
}
