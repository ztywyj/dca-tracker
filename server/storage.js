import fs from 'node:fs'
import path from 'node:path'

export const STORAGE_KEYS = {
  plan: 'dca-tracker:plan',
  plans: 'dca-tracker:plans',
  activePlanId: 'dca-tracker:active-plan-id',
  records: 'dca-tracker:records',
}

const STORAGE_SCHEMA_VERSION = 1
const DATA_FILENAME = 'dca-data.json'
const BACKUP_DIRNAME = 'backups'
const MAX_BACKUP_FILES = 20

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

export function createEmptyData() {
  return {
    [STORAGE_KEYS.plan]: null,
    [STORAGE_KEYS.plans]: [],
    [STORAGE_KEYS.activePlanId]: null,
    [STORAGE_KEYS.records]: [],
  }
}

function sanitizeData(data) {
  const source = ensureObject(data)

  return {
    [STORAGE_KEYS.plan]: source[STORAGE_KEYS.plan] ?? null,
    [STORAGE_KEYS.plans]: Array.isArray(source[STORAGE_KEYS.plans]) ? source[STORAGE_KEYS.plans] : [],
    [STORAGE_KEYS.activePlanId]: typeof source[STORAGE_KEYS.activePlanId] === 'string' ? source[STORAGE_KEYS.activePlanId] : null,
    [STORAGE_KEYS.records]: Array.isArray(source[STORAGE_KEYS.records]) ? source[STORAGE_KEYS.records] : [],
  }
}

export function createEmptySnapshot() {
  return {
    version: STORAGE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    data: createEmptyData(),
  }
}

function normalizeSnapshot(snapshot) {
  const source = ensureObject(snapshot)
  const dataSource = ensureObject(source.data)
  const mergedSource = Object.keys(dataSource).length ? dataSource : source

  return {
    version: STORAGE_SCHEMA_VERSION,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : new Date().toISOString(),
    data: sanitizeData(mergedSource),
  }
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJsonFile(filePath, payload) {
  ensureDir(path.dirname(filePath))
  const tempFilePath = `${filePath}.tmp`
  fs.writeFileSync(tempFilePath, JSON.stringify(payload, null, 2), 'utf8')

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true })
  }

  fs.renameSync(tempFilePath, filePath)
}

export function getStorageDir(baseDir) {
  const configuredDir = process.env.DATA_DIR?.trim()
  return path.resolve(configuredDir || path.join(baseDir, 'data'))
}

function resolveStoragePaths(baseDir) {
  const storageDir = getStorageDir(baseDir)

  return {
    storageDir,
    dataFile: path.join(storageDir, DATA_FILENAME),
    backupDir: path.join(storageDir, BACKUP_DIRNAME),
  }
}

function listBackupFiles(backupDir) {
  if (!fs.existsSync(backupDir)) {
    return []
  }

  return fs.readdirSync(backupDir)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => path.join(backupDir, fileName))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)
}

function pruneBackups(backupDir) {
  listBackupFiles(backupDir)
    .slice(MAX_BACKUP_FILES)
    .forEach((filePath) => fs.rmSync(filePath, { force: true }))
}

function createBackup(paths, snapshot, reason = 'save') {
  ensureDir(paths.backupDir)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupFile = path.join(paths.backupDir, `${timestamp}-${reason}.json`)
  writeJsonFile(backupFile, snapshot)
  pruneBackups(paths.backupDir)
  return backupFile
}

function loadLatestValidBackup(backupDir) {
  const files = listBackupFiles(backupDir)

  for (const filePath of files) {
    try {
      return {
        filePath,
        snapshot: normalizeSnapshot(readJsonFile(filePath)),
      }
    } catch {
      continue
    }
  }

  return null
}

function buildMeta(paths, snapshot, overrides = {}) {
  return {
    mode: 'server-file',
    storageDir: paths.storageDir,
    dataFile: paths.dataFile,
    backupDir: paths.backupDir,
    backupCount: listBackupFiles(paths.backupDir).length,
    recoveredFromBackup: false,
    recoveryFile: '',
    recoveryReason: '',
    lastLoadSource: 'primary',
    lastSavedAt: snapshot.updatedAt,
    ...overrides,
  }
}

export function loadStorageState(baseDir) {
  const paths = resolveStoragePaths(baseDir)
  ensureDir(paths.storageDir)
  ensureDir(paths.backupDir)

  if (!fs.existsSync(paths.dataFile)) {
    const snapshot = createEmptySnapshot()
    writeJsonFile(paths.dataFile, snapshot)
    createBackup(paths, snapshot, 'init')

    return {
      snapshot,
      meta: buildMeta(paths, snapshot, { lastLoadSource: 'new-file' }),
    }
  }

  try {
    const snapshot = normalizeSnapshot(readJsonFile(paths.dataFile))

    return {
      snapshot,
      meta: buildMeta(paths, snapshot),
    }
  } catch (error) {
    const recovered = loadLatestValidBackup(paths.backupDir)

    if (recovered) {
      writeJsonFile(paths.dataFile, recovered.snapshot)

      return {
        snapshot: recovered.snapshot,
        meta: buildMeta(paths, recovered.snapshot, {
          lastLoadSource: 'backup',
          recoveredFromBackup: true,
          recoveryFile: recovered.filePath,
          recoveryReason: error instanceof Error ? error.message : 'Primary storage file is corrupted.',
        }),
      }
    }

    const snapshot = createEmptySnapshot()
    writeJsonFile(paths.dataFile, snapshot)
    createBackup(paths, snapshot, 'reseed')

    return {
      snapshot,
      meta: buildMeta(paths, snapshot, {
        lastLoadSource: 'reseed',
        recoveryReason: error instanceof Error ? error.message : 'Primary storage file is corrupted and no backup is available.',
      }),
    }
  }
}

export function saveStorageState(baseDir, nextData, { createBackupFile = true, backupReason = 'save' } = {}) {
  const paths = resolveStoragePaths(baseDir)
  ensureDir(paths.storageDir)
  ensureDir(paths.backupDir)

  const snapshot = normalizeSnapshot({
    updatedAt: new Date().toISOString(),
    data: nextData,
  })

  writeJsonFile(paths.dataFile, snapshot)

  if (createBackupFile) {
    createBackup(paths, snapshot, backupReason)
  }

  return {
    snapshot,
    meta: buildMeta(paths, snapshot),
  }
}
