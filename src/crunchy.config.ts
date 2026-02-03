const BEST_TITLE_SYSTEM_PROMPT = `You are a Sales Director looking to help the user figure out 
who is the best contact to reach out to at a particular company. To help, you will be given a list 
of titles by the user that are ordered by the best person to reach out to given a list of contacts. 
Along with this list, you will be given another list of titles for the contacts we have at the 
particular company. Your task is to choose the contact who has their title most closely match the 
highest priority title in your priority list. You will leverage your expertise as a Sales Director 
to do this. Here are some examples: 

=== Example One ===
priorityTitles = ["Chief Technology Officer", "CTO", "Vice President of Technology"]
contactTitles = ["Product Head", "Head of Design", "VP Technology"]

respond with: bestTitle = "VP Technology"
===================

=== Example Two ===
priorityTitles = ["Founder", "Co-Founder", "CTO", "Chief Technology Officer"]
contactTitles = ["COO", "Tech Lead", "Founder and Chief Architect"]

respond with: bestTitle = "Founder and Chief Architect"
===================

=== Example Three ===
priorityTitles = ["Head of Product", "Director of Product", "CTO", "Chief Technology Officer"]
contactTitles = ["CTO", "Vice President of Product", "Sales Engineer"]

respond with: bestTitle = "Vice President of Product"
=====================
`;

const buckets = [
  'ASmall',
  'ALarge',
  'SeedSmall',
  'SeedLarge',
  'BCCS',
  'BCLarge',
  'BCSmall',
  'Preseed',
] as const;

export type RaiseSegment = (typeof buckets)[number];

const titlePriorities: Record<RaiseSegment, string[]> = {
  Preseed: [
    'Chief Executive Officer',
    'CEO',
    'Founder',
    'Co-Founder',
    'Chief Technology Officer',
    'CTO',
    'Vice President of Technology',
    'VP Technology',
    'Head of Technology',
  ],
  SeedSmall: [
    'Chief Executive Officer',
    'CEO',
    'Founder',
    'Chief Technology Officer',
    'CTO',
    'Chief Operating Officer',
    'COO',
    'VP Technology',
    'Head of Technology',
  ],
  SeedLarge: [
    'Chief Technology Officer',
    'CTO',
    'VP Technology',
    'Head of Technology',
    'Chief Executive Officer',
    'CEO',
    'Chief Operating Officer',
    'COO',
    'Founder',
  ],
  ASmall: [
    'Chief Executive Officer',
    'CEO',
    'Founder',
    'Chief Technology Officer',
    'CTO',
    'VP Technology',
    'Head of Technology',
    'Chief Operating Officer',
    'COO',
  ],
  ALarge: [
    'Chief Technology Officer',
    'CTO',
    'VP Technology',
    'Head of Technology',
    'Chief Executive Officer',
    'CEO',
    'Chief Operating Officer',
    'COO',
    'Founder',
  ],
  BCCS: [
    'VP of Customer Success',
    'VP of CS',
    'Head of Customer Success',
    'Head of CS',
    'Customer Success Lead',
    'CS Lead',
    'Director of Customer Success',
    'Director of CS',
    'Customer Success Manager',
    'CSM',
  ],
  BCSmall: [
    'Chief Technology Officer',
    'CTO',
    'VP Technology',
    'Head of Technology',
    'Chief Product Officer',
    'CPO',
    'VP of Product',
    'Head of Product',
  ],
  BCLarge: [
    'Chief Product Officer',
    'CPO',
    'VP of Product',
    'Head of Product',
    'Chief Technology Officer',
    'CTO',
    'VP Technology',
    'Head of Technology',
  ],
};

export type CrunchyOptions = {
  needsFundingAmount?: boolean
  needsLeadInvestor?: boolean
}

const options: Record<RaiseSegment, CrunchyOptions> = {
  'Preseed': {
    needsFundingAmount: false,
    needsLeadInvestor: false,
  },
  'SeedSmall': {
    needsFundingAmount: true,
    needsLeadInvestor: false,
  },
  'SeedLarge': {
    needsFundingAmount: true,
    needsLeadInvestor: false,
  },
  'ASmall': {
    needsFundingAmount: true,
    needsLeadInvestor: true
  },
  'ALarge': {
    needsFundingAmount: true,
    needsLeadInvestor: true
  },
  'BCSmall': {
    needsFundingAmount: true,
    needsLeadInvestor: true
  },
  'BCLarge': {
    needsFundingAmount: true,
    needsLeadInvestor: true
  },
  'BCCS': {
    needsFundingAmount: true,
    needsLeadInvestor: true
  }
}

const crunchyConfig = {
  bestTitle: {
    model: 'gpt-5-mini-2025-08-07',
    systemPrompt: BEST_TITLE_SYSTEM_PROMPT,
    userPromptGenerator: (contactTitles: string[], priorityTitles: string[]) => {
      return `priorityTitles = ${JSON.stringify(priorityTitles)}\ncontactTitles=${JSON.stringify(contactTitles)}`;
    },
    titlePriorities,
  },
  buckets,
  options
} as const;

export default crunchyConfig;
