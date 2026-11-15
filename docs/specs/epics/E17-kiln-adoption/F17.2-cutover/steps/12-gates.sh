#!/usr/bin/env bash
# S17.2.1 step 12: the gates. KILN_DOCTOR_FULL=1 makes lint's doctor the full run CI
# does on main. pnpm audit is node-lib's extra (kiln's cutover runbook).
set -euo pipefail
task validate
KILN_DOCTOR_FULL=1 task lint
task docs:build
pnpm audit --prod --audit-level moderate
