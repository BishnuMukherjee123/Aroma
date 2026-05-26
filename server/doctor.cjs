// doctor.cjs
const fs = require('fs')
const path = require('path')

function readJSON(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    return JSON.parse(content);
  } catch (err) {
    console.error(`Warning: Failed to parse ${filePath}:`, err.message);
    return null;
  }
}

console.log('\n🩺 Running Express Doctor...\n')

// --- ESLint ---
const eslintData = readJSON('.doctor/eslint-report.json') || []
const totalErrors   = eslintData.reduce((a, f) => a + f.errorCount, 0)
const totalWarnings = eslintData.reduce((a, f) => a + f.warningCount, 0)
const totalFiles    = eslintData.length
const filesWithIssues = eslintData.filter(f => f.errorCount + f.warningCount > 0).length

// --- jscpd ---
const dupeData = readJSON('.doctor/jscpd-report.json')
const dupePercent = dupeData?.statistics?.total?.percentage ?? 0
const dupeClones  = dupeData?.statistics?.total?.clones ?? 0

// --- knip ---
const knipData   = readJSON('.doctor/knip-report.json') || {}
// Support both old flat format and modern nested issues format:
const unusedFiles = knipData.files 
  ? knipData.files.length 
  : (knipData.issues?.reduce((acc, issue) => acc + (issue.files || []).length, 0) || 0)

const unusedExports = knipData.exports 
  ? knipData.exports.length 
  : (knipData.issues?.reduce((acc, issue) => acc + (issue.exports || []).length + (issue.types || []).length, 0) || 0)

const unusedDeps = knipData.dependencies 
  ? knipData.dependencies.length 
  : (knipData.issues?.reduce((acc, issue) => acc + (issue.dependencies || []).length, 0) || 0)

// --- Plato ---
const platoOverview = readJSON('.doctor/plato/report.json')
let maintainability = platoOverview?.summary?.average?.maintainability ?? 100
if (typeof maintainability === 'string') {
  maintainability = parseFloat(maintainability)
}
if (isNaN(maintainability)) {
  maintainability = 100
}

// --- Score Calculation ---
const eslintPenalty        = Math.min(totalErrors * 3 + totalWarnings * 0.5, 35)
const dupePenalty          = Math.min(dupePercent * 2, 25)
const deadCodePenalty      = Math.min((unusedFiles * 2) + (unusedExports * 0.5) + (unusedDeps * 1), 20)
const maintainPenalty      = Math.max(0, (100 - maintainability) * 0.2)

const rawScore = 100 - eslintPenalty - dupePenalty - deadCodePenalty - maintainPenalty
const score    = Math.max(0, Math.min(100, rawScore)).toFixed(1)

// --- Status ---
let status, emoji
if (score >= 85)      { status = 'Excellent'; emoji = '✅' }
else if (score >= 70) { status = 'Good';      emoji = '🟢' }
else if (score >= 55) { status = 'Fair';      emoji = '⚠️ ' }
else if (score >= 40) { status = 'Poor';      emoji = '🟠' }
else                  { status = 'Critical';  emoji = '❌' }

// --- Report ---
console.log('════════════════════════════════════════')
console.log('         EXPRESS DOCTOR REPORT          ')
console.log('════════════════════════════════════════')
console.log(`\n  ${emoji}  Overall Health Score: ${score}%`)
console.log(`      Status: ${status}\n`)
console.log('────────────────────────────────────────')
console.log(' CATEGORY                   SCORE')
console.log('────────────────────────────────────────')
console.log(` Code quality (ESLint)      ${Math.max(0, 35 - eslintPenalty).toFixed(0)}/35`)
console.log(` Duplication (jscpd)        ${Math.max(0, 25 - dupePenalty).toFixed(0)}/25`)
console.log(` Dead code (knip)           ${Math.max(0, 20 - deadCodePenalty).toFixed(0)}/20`)
console.log(` Maintainability (plato)    ${Math.max(0, 20 - maintainPenalty).toFixed(0)}/20`)
console.log('────────────────────────────────────────')
console.log('\n DETAILS')
console.log('────────────────────────────────────────')
console.log(` ESLint errors:             ${totalErrors}`)
console.log(` ESLint warnings:           ${totalWarnings}`)
console.log(` Files with issues:         ${filesWithIssues} / ${totalFiles}`)
console.log(` Duplicate code:            ${dupePercent.toFixed(1)}%  (${dupeClones} clones)`)
console.log(` Unused files:              ${unusedFiles}`)
console.log(` Unused exports:            ${unusedExports}`)
console.log(` Unused dependencies:       ${unusedDeps}`)
console.log(` Avg maintainability:       ${maintainability.toFixed(1)} / 100`)
console.log('════════════════════════════════════════\n')

// --- Recommendations ---
console.log(' RECOMMENDATIONS')
console.log('────────────────────────────────────────')
if (totalErrors > 0)
  console.log(` ❌ Fix ${totalErrors} ESLint error(s) — check .doctor/eslint-report.json`)
if (totalWarnings > 10)
  console.log(` ⚠️  Reduce ESLint warnings (${totalWarnings} found)`)
if (dupePercent > 5)
  console.log(` 🔁 Refactor duplicate code — ${dupePercent.toFixed(1)}% duplication detected`)
if (unusedFiles > 0)
  console.log(` 🗑  Remove ${unusedFiles} unused file(s) found by knip`)
if (unusedDeps > 0)
  console.log(` 📦 Uninstall ${unusedDeps} unused npm package(s)`)
if (maintainability < 65)
  console.log(` 🧹 Improve code structure — low maintainability score (${maintainability.toFixed(1)})`)
if (score >= 85)
  console.log(` 🎉 Great job! Your codebase is in excellent health.`)
console.log('════════════════════════════════════════\n')
