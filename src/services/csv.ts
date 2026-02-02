import { createReadStream } from 'fs';
import * as csv from 'fast-csv';
import z from 'zod';
import path from 'path';

const RawInputSchema = z.strictObject({
  'Organization Name': z.string(),
  'Organization Name URL': z.string().nullable(),
  'Last Funding Date': z.string(),
  'Last Funding Type': z.string(),
  'Number of Employees': z.string(),
  'Headquarters Location': z.string(),
  'Description': z.string().nullable(),
  'Last Funding Amount': z.string(),
  'Last Funding Amount Currency': z.string(),
  'Last Funding Amount (in USD)': z.string(),
  'Lead Investors': z.string().nullable(),
  'Website': z.string()
});

type RawInput = z.infer<typeof RawInputSchema>

export async function getInputFromCsv(inputFile: string): Promise<{
  rows: RawInput[]
  totalRows: number
}> {
  const rows: RawInput[] = []
  let totalRows = 0

  const consolidatedInputPath = path.resolve(`${process.cwd()}/src/inputFiles/`, inputFile)

  return new Promise((resolve, reject) => {
    const parser = csv.parse<RawInput, RawInput>({ headers: true })

    createReadStream(consolidatedInputPath)
      .pipe(parser)
      .on("error", reject)
      .on("data", (data) => {
        try {
          const parsed = RawInputSchema.parse(data)
          rows.push(parsed)
          totalRows++
        } catch (err) {
          reject(err)
          parser.destroy()
        }
      })
      .on("end", () => {
        resolve({ rows, totalRows })
      })
  })
}

export function writeToCsv<T extends Record<string, unknown>>(outputFile: string, rows: Array<T>) {
  const consolidatedOutputPath = path.resolve(`${process.cwd()}/src/outputFiles/`, outputFile)
  csv.writeToPath(consolidatedOutputPath, rows, {
    headers: true,
    includeEndRowDelimiter: true
  })
}
