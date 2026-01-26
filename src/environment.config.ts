import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

const EnvironmentSchema = z
  .object({
    openai: z.object({
      OPENAI_API_KEY: z.string(),
    }),
    apollo: z.object({
      APOLLO_API_KEY: z.string(),
      baseApiUrl: z.string().default('https://api.apollo.io/api/v1'),
    }),
  })
  .strict();

const environmentValues = {
  openai: {
    OPENAI_API_KEY: process.env['OPENAI_API_KEY']!,
  },
  apollo: {
    APOLLO_API_KEY: process.env['APOLLO_API_KEY']!,
  },
} satisfies z.input<typeof EnvironmentSchema>;

const config = EnvironmentSchema.parse(environmentValues);

export default config;
