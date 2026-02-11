import { runCrunchyWithLocalCsv, runLendbaeWithLocalCsv } from "./scripts.js"

async function main() {
  await runCrunchyWithLocalCsv('Crunchy2026JanuaryBCCS.csv', 'BCCS')
  await runLendbaeWithLocalCsv('LendBae_Sample.csv')
}

main()
