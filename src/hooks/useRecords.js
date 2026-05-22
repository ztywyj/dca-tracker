import { useMemo, useState } from 'react'
import { loadRecords, saveRecords } from '../utils/storage'

export function useRecords() {
  const [records, setRecords] = useState(() => loadRecords())

  const addRecord = (record) => {
    setRecords((current) => {
      const nextRecords = [record, ...current]
      saveRecords(nextRecords)
      return nextRecords
    })
  }

  const replaceRecords = (nextRecords) => {
    const safeRecords = Array.isArray(nextRecords) ? nextRecords : []
    saveRecords(safeRecords)
    setRecords(safeRecords)
  }

  return useMemo(
    () => ({
      records,
      addRecord,
      replaceRecords,
    }),
    [records],
  )
}
