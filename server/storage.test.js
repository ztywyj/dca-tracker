import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS, getStorageDir, loadStorageState, saveStorageState } from './storage.js'

const tempDirs = []

function createTempBaseDir() {
  const dirPath = fs.mkdtempSync(path.join(os.tmpdir(), 'dca-tracker-server-'))
  tempDirs.push(dirPath)
  return dirPath
}

afterEach(() => {
  delete process.env.DATA_DIR
  tempDirs.splice(0).forEach((dirPath) => {
    fs.rmSync(dirPath, { recursive: true, force: true })
  })
})

describe('server file storage', () => {
  it('creates the initial data file and backup on first load', () => {
    const baseDir = createTempBaseDir()
    const { snapshot, meta } = loadStorageState(baseDir)

    expect(meta.storageDir).toBe(getStorageDir(baseDir))
    expect(meta.backupCount).toBe(1)
    expect(snapshot.data[STORAGE_KEYS.plans]).toEqual([])
    expect(fs.existsSync(meta.dataFile)).toBe(true)
  })

  it('recovers from the latest valid backup when the primary file is corrupted', () => {
    const baseDir = createTempBaseDir()
    const initial = loadStorageState(baseDir)

    saveStorageState(baseDir, {
      ...initial.snapshot.data,
      [STORAGE_KEYS.plans]: [{ id: 'plan-1', name: 'Recovered plan' }],
    })

    fs.writeFileSync(initial.meta.dataFile, '{broken-json', 'utf8')

    const recovered = loadStorageState(baseDir)

    expect(recovered.meta.recoveredFromBackup).toBe(true)
    expect(recovered.snapshot.data[STORAGE_KEYS.plans][0].name).toBe('Recovered plan')
  })

  it('uses DATA_DIR from the environment when provided', () => {
    const baseDir = createTempBaseDir()
    const mountedDataDir = path.join(baseDir, 'nas-volume')
    process.env.DATA_DIR = mountedDataDir

    const { meta } = loadStorageState(baseDir)

    expect(meta.storageDir).toBe(path.resolve(mountedDataDir))
    expect(fs.existsSync(meta.dataFile)).toBe(true)
  })
})
