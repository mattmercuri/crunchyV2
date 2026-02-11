import type { CrunchyOptions } from "./crunchy.config.js";

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

export interface PipelineContext {
  logger: Logger;
  tracker: Tracker;
  throwError(message: string): never;
  config: {
    titlesToSearch: string[];
    options: CrunchyOptions;
    totalRows: number;
  }
}

export interface PipelineStage<InputSchema, OutputSchema> {
  name: string;
  process(input: InputSchema, context: PipelineContext): Promise<OutputSchema> | OutputSchema
}

export class RunLogger implements Logger {
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

export class RunTracker implements Tracker {
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
    const totalProcessed = this.enrichments + this.errors
    const successPercentage = Math.round((this.enrichments / totalProcessed) * 100)

    console.log('========== COMPLETED CRUNCHY RUN ==========')
    console.log(`|| +++++++++++++++++ ${successPercentage}% +++++++++++++++++`)
    console.log(`|| ----------------------------------------`)
    console.log(`|| ENRICHMENTS: ${this.enrichments}`)
    console.log(`|| ERRORS: ${this.errors}`)
    console.log(`|| TOTAL: ${totalProcessed}`)
    console.log(`|| ----------------------------------------`)
  }
}

export class Pipeline<InitialInput, CurrentOutput> {
  private constructor(
    private readonly steps: PipelineStage<any, any>[] = []
  ) { }

  static create<T>(): Pipeline<T, T> {
    return new Pipeline([])
  }

  pipe<StageInput, StageOutput>(
    stage: PipelineStage<StageInput, StageOutput> & (CurrentOutput extends StageInput ? unknown : never)
  ): Pipeline<InitialInput, CurrentOutput & StageOutput> {
    return new Pipeline([...this.steps, stage])
  }

  async run(input: InitialInput, context: PipelineContext): Promise<CurrentOutput> {
    let currentData: any = input

    for (const stage of this.steps) {
      try {
        currentData = await stage.process(currentData, context)
      } catch (err) {
        context.tracker.incrementErrors()
        if (err instanceof Error) {
          context.logger.error(err.message)
        } else {
          context.logger.error(`Unknown error occured: ${JSON.stringify(err, null, 2)}`)
        }

        break
      }
    }

    return currentData
  }
}