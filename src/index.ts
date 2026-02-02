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
