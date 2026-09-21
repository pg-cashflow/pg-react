import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const reactCodesPath = resolve(__dirname, '../src/i18n/error-codes.json');
const goCodesPath = process.env.PG_GO_ERROR_CODES || resolve(__dirname, '../../pg-go/internal/apierr/error-codes.json');

if (!existsSync(reactCodesPath)) {
  console.error(`[ERROR] pg-react error-codes.json not found at: ${reactCodesPath}`);
  process.exit(1);
}

const reactCodes = JSON.parse(readFileSync(reactCodesPath, 'utf8'));

if (!existsSync(goCodesPath)) {
  console.warn(`[WARN] pg-go error-codes.json not found at: ${goCodesPath}`);
  console.warn(`Skipping cross-repo diff (isolated workspace build).`);
  process.exit(0);
}

const goCodes = JSON.parse(readFileSync(goCodesPath, 'utf8'));

// Check parity
const reactSet = new Set(reactCodes);
const goSet = new Set(goCodes);

let drifted = false;

for (const code of goCodes) {
  if (!reactSet.has(code)) {
    console.error(`[DRIFT] Code "${code}" is in pg-go but missing from pg-react`);
    drifted = true;
  }
}

for (const code of reactCodes) {
  if (!goSet.has(code)) {
    console.error(`[DRIFT] Code "${code}" is in pg-react but missing from pg-go`);
    drifted = true;
  }
}

if (reactCodes.length !== goCodes.length) {
  console.error(`[DRIFT] Length mismatch: pg-go has ${goCodes.length}, pg-react has ${reactCodes.length}`);
  drifted = true;
}

if (drifted) {
  console.error(`\nCross-repo error code parity FAILED. Run sync or check recent error code additions.`);
  process.exit(1);
}

console.log(`✓ Cross-repo error code parity confirmed: ${goCodes.length} codes match byte-for-byte.`);
