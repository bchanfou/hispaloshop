import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const reportPath = path.join(ROOT, 'architecture-reports', 's27-api-contract-report.json');
const baselinePath = path.join(ROOT, 'architecture-reports', 'api-contract-baseline.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const report = readJson(reportPath);
  const baseline = readJson(baselinePath);

  const current = Number(report.potential_mismatches || 0);
  const allowed = Number(baseline.max_allowed_mismatches || 0);

  console.log(`api_contract_current=${current}`);
  console.log(`api_contract_allowed=${allowed}`);

  if (current > allowed) {
    console.error(
      `API contract mismatches increased (${current} > ${allowed}). ` +
      'Run `npm run api:contract:report` and fix or explicitly update baseline if intentional.'
    );
    process.exit(1);
  }

  console.log('API contract check passed (no mismatch regression).');
}

main();
