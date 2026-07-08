import { downloadFile } from './download'
import { markBackedUp } from './storage'

export const BACKUP_SCHEMA_VERSION = '2.0'

// Builds the full backup payload. Falls back to the single active plan only
// when a full plans list isn't available, so older call sites stay safe.
export function buildBackupPayload(plan, plans, records) {
  const safePlans = Array.isArray(plans) && plans.length
    ? plans
    : plan
      ? [plan]
      : []

  return {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    plans: safePlans,
    activePlanId: plan?.id || null,
    plan,
    records: Array.isArray(records) ? records : [],
  }
}

export function buildBackupFilename(date = new Date()) {
  return `dca-backup-${date.toISOString().slice(0, 10)}.json`
}

// Triggers the JSON backup download and records the backup timestamp so the
// reminder banner knows the current data is safely exported.
export function downloadBackupJson(plan, plans, records) {
  const payload = buildBackupPayload(plan, plans, records)
  downloadFile(buildBackupFilename(), JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;')
  markBackedUp()
  return payload
}
