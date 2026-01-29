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
}

interface PipelineContext {
  logger: Logger;
  tracker: Tracker;
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
}
