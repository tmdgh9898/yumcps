import { useEffect, useMemo, useRef, useState } from 'react'
import api from './api/client'
import './index.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function buildMonthRange(startMonth, endMonth) {
  const [startYear, startMon] = startMonth.split('-').map(Number)
  const [endYear, endMon] = endMonth.split('-').map(Number)
  const months = []

  let year = startYear
  let mon = startMon
  while (year < endYear || (year === endYear && mon <= endMon)) {
    months.push(`${year}-${String(mon).padStart(2, '0')}`)
    mon += 1
    if (mon > 12) {
      mon = 1
      year += 1
    }
  }
  return months
}

function formatMonthLabel(month, short = false) {
  const [year, mon] = String(month || '').split('-')
  if (!year || !mon) return String(month || '')
  return short ? `${year.slice(2)}.${mon}` : `${year}.${mon}`
}

const MONTHS = buildMonthRange('2025-09', '2027-02')
const SUBTITLE_TEXT = '\uC6D4\uAC04\uBCF4\uACE0 \uC790\uB3D9\uD654 \uBC0F \uC2EC\uC0AC \uC810\uC218 \uD655\uC778'
const YEAR_LABELS = ['1\uB144\uCC28', '2\uB144\uCC28', '3\uB144\uCC28', '4\uB144\uCC28']
const SCORE_PREFIX = '\uCD1D \uC804\uACF5\uC758\uC218'
const YEAR_COUNT_LABEL = '\uB144\uCC28 \uC218'
const DISCHARGE_FIXED_TITLE = '\uD1F4\uC6D0\uD658\uC790 \uC218 (\uD1F4\uC6D0 + \uC804\uCD9C)'
const OUTPATIENT_FIXED_TITLE = '\uC678\uB798 \uD658\uC790 \uC218'
const ER_SUTURE_MONTHLY_TITLE = 'ER Suture'
const DISCHARGE_FIXED_MONTH_KEYS = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01']
const DISCHARGE_FIXED_HEADERS = [
  '\uB2F4\uB2F9\uAD50\uC218',
  ...DISCHARGE_FIXED_MONTH_KEYS.map((m) => m.replace('-', '.')),
  '\uAD50\uC218\uBCC4 \uD569\uACC4',
]
const DISCHARGE_FIXED_ROWS = [
  { professor: '\uAE40\uC6A9\uD558', months: [5, 8, 0, 0, 6], total: 19 },
  { professor: '\uAE40\uD0DC\uACE4', months: [4, 3, 4, 2, 0], total: 13 },
  { professor: '\uC774\uC900\uD638', months: [21, 9, 12, 24, 11], total: 77 },
  { professor: '\uAE40\uC77C\uAD6D', months: [13, 10, 12, 9, 7], total: 51 },
  { professor: '\uAE40\uC131\uC740', months: [1, 5, 1, 4, 5], total: 16 },
]
const OUTPATIENT_FIXED_ROWS = [
  { label: '\uCD08\uC9C4', months: [174, 144, 123, 146, 125], total: 712 },
  { label: '\uC7AC\uC9C4', months: [349, 323, 311, 327, 399], total: 1709 },
]
const ER_SUTURE_FIXED_BY_MONTH = {
  '2025-09': 14,
  '2025-10': 47,
  '2025-11': 29,
  '2025-12': 39,
  '2026-01': 28,
}
const EMPTY_OUTPATIENT = { total_first: 0, total_re: 0, total_er_first: 0, total_er_suture: 0 }
const DISCHARGE_HEADER_FIRST = DISCHARGE_FIXED_HEADERS[0]
const DISCHARGE_HEADER_LAST = DISCHARGE_FIXED_HEADERS[DISCHARGE_FIXED_HEADERS.length - 1]
const MONTH_TOTAL_LABEL = '\uC6D4\uBCC4 \uD569\uACC4'
const CLASS_LABEL = '\uAD6C\uBD84'
const TOTAL_LABEL = '\uD569\uACC4'
const FILE_LOG_TITLE = '\uD30C\uC77C \uB85C\uADF8'
const FILE_LOG_PAGE_SIZE = 20
const CATEGORY_MODAL_TITLE = '\uC2EC\uC0AC \uC810\uC218'
const DISCHARGE_SCORE_BUTTON_LABEL = '\uD559\uD68C\uC2EC\uC0AC \uC810\uC218 \uCDA9\uC871\uC694\uAC74 \uD655\uC778'
const OUTPATIENT_SCORE_BUTTON_LABEL = '\uD559\uD68C\uC2EC\uC0AC \uC810\uC218 \uCDA9\uC871\uC694\uAC74 \uD655\uC778'
const ER_SCORE_BUTTON_LABEL = '\uD559\uD68C\uC2EC\uC0AC \uC810\uC218 \uCDA9\uC871\uC694\uAC74 \uD655\uC778'
const ER_SCORE_MODAL_TITLE = '\uC751\uAE09\uC2E4 \uC810\uC218'
const SURGERY_SCORE_BUTTON_LABEL = '\uD559\uD68C\uC2EC\uC0AC \uC810\uC218 \uCDA9\uC871\uC694\uAC74 \uD655\uC778'
const SURGERY_SCORE_MODAL_TITLE = '\uBD84\uC57C\uBCC4 \uC218\uC220 \uAC74\uC218'
const ENABLE_SCORE_NEXT_STEP_HINT = true
const THEME_STORAGE_KEY = 'yumcps.theme.v1'
const SCORE_INPUT_STORAGE_KEY = 'yumcps.scoreInputByMonth.v1'
const DISCHARGE_SCORE_INPUT_STORAGE_KEY = 'yumcps.dischargeScoreInputByMonth.v1'
const ER_SCORE_INPUT_STORAGE_KEY = 'yumcps.erScoreInputByMonth.v1'
const METRIC_SYNC_STORAGE_KEY = 'yumcps.metricSyncByMonth.v1'
const SCORE_BASE_ROWS_OUTPATIENT = [
  { id: 1, label: '\u2460 2500\uBA85 \uBBF8\uB9CC', min: 0, max: 2499, score: 0 },
  { id: 2, label: '\u2461 2500~3500\uBA85', min: 2500, max: 3500, score: 2 },
  { id: 3, label: '\u2462 3501~4500\uBA85', min: 3501, max: 4500, score: 4 },
  { id: 4, label: '\u2463 4501~5500\uBA85', min: 4501, max: 5500, score: 6 },
  { id: 5, label: '\u2464 5501~6500\uBA85', min: 5501, max: 6500, score: 7 },
  { id: 6, label: '\u2465 6501\uBA85 \uC774\uC0C1', min: 6501, max: Number.POSITIVE_INFINITY, score: 8 },
]
const SCORE_BASE_ROWS = [
  { id: 1, label: '\u2460 300\uBA85 \uBBF8\uB9CC', min: 0, max: 299, score: 0 },
  { id: 2, label: '\u2461 300 ~ 350\uBA85', min: 300, max: 350, score: 2 },
  { id: 3, label: '\u2462 351 ~ 400\uBA85', min: 351, max: 400, score: 4 },
  { id: 4, label: '\u2463 401 ~ 450\uBA85', min: 401, max: 450, score: 6 },
  { id: 5, label: '\u2464 451\uBA85 \uC774\uC0C1', min: 451, max: Number.POSITIVE_INFINITY, score: 8 },
]
const ER_SCORE_ROWS = [
  { id: 1, label: '\u2460 0~24\uAC74', min: 0, max: 24, score: 0 },
  { id: 2, label: '\u2461 25~49\uAC74', min: 25, max: 49, score: 0.5 },
  { id: 3, label: '\u2462 50\uAC74 \uC774\uC0C1', min: 50, max: Number.POSITIVE_INFINITY, score: 1 },
]
const SURGERY_CATEGORY_LABEL_BY_KEY = {
  headneck_congenital: '\uB450\uACBD\uBD80 - \uC120\uCC9C\uAE30\uD615',
  headneck_tumor: '\uB450\uACBD\uBD80 - \uC885\uC591',
  headneck_trauma_infection_etc: '\uB450\uACBD\uBD80 - \uC678\uC0C1, \uAC10\uC5FC \uBC0F \uAE30\uD0C0',
  breast_trunk_leg_congenital: '\uC720\uBC29, \uCCB4\uAC04 \uBC0F \uD558\uC9C0 - \uC120\uCC9C\uAE30\uD615',
  breast_trunk_leg_tumor: '\uC720\uBC29, \uCCB4\uAC04 \uBC0F \uD558\uC9C0 - \uC885\uC591',
  breast_trunk_leg_trauma_infection_etc: '\uC720\uBC29, \uCCB4\uAC04 \uBC0F \uD558\uC9C0 - \uC678\uC0C1, \uAC10\uC5FC \uBC0F \uAE30\uD0C0',
  hand_upper_congenital: '\uC218\uBD80 \uBC0F \uC0C1\uC9C0 - \uC120\uCC9C\uAE30\uD615',
  hand_upper_tumor: '\uC218\uBD80 \uBC0F \uC0C1\uC9C0 - \uC885\uC591',
  hand_upper_trauma_infection_etc: '\uC218\uBD80 \uBC0F \uC0C1\uC9C0 - \uC678\uC0C1, \uAC10\uC5FC \uBC0F \uAE30\uD0C0',
  skin_tumor: '\uD53C\uBD80\uC885\uC591',
  cosmetic: '\uBBF8\uC6A9',
}
const DIAGNOSIS_LABEL_BY_CODE = {
  A: 'A. \uB450\uACBD\uBD80 \uC120\uCC9C\uAE30\uD615',
  B: 'B. \uB450\uACBD\uBD80 \uC885\uC591',
  C: 'C. \uB450\uACBD\uBD80 \uC678\uC0C1,\uAC10\uC5FC \uBC0F \uAE30\uD0C0',
  D: 'D. \uC720\uBC29, \uCCB4\uAC04 \uBC0F \uD558\uC9C0, \uC120\uCC9C\uAE30\uD615',
  E: 'E. \uC720\uBC29, \uCCB4\uAC04 \uBC0F \uD558\uC9C0 \uC885\uC591',
  F: 'F. \uC720\uBC29, \uCCB4\uAC04 \uBC0F \uD558\uC9C0 \uC678\uC0C1, \uAC10\uC5FC \uBC0F \uAE30\uD0C0',
  G: 'G. \uC218\uBD80 \uBC0F \uC0C1\uC9C0 \uC120\uCC9C\uAE30\uD615',
  H: 'H. \uC218\uBD80 \uBC0F \uC0C1\uC9C0 \uC885\uC591',
  I: 'I. \uC218\uBD80 \uBC0F \uC0C1\uC9C0 \uC678\uC0C1, \uAC10\uC5FC \uBC0F \uAE30\uD0C0',
  J: 'J. \uD53C\uBD80\uC885\uC591',
  K: 'K. \uBBF8\uC6A9',
}
const DIAGNOSIS_CODE_OPTIONS = Object.entries(DIAGNOSIS_LABEL_BY_CODE).map(([code, label]) => ({ code, label }))
const DETAIL_MODAL_INITIAL_STATE = { show: false, professor: '', cases: [] }

function normalizeNonNegativeInt(value) {
  return Math.max(0, Math.floor(Number(value) || 0))
}

function normalizeMonthValueMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const next = {}
  Object.entries(value).forEach(([month, raw]) => {
    const monthKey = String(month || '').trim()
    if (!monthKey) return
    next[monthKey] = normalizeNonNegativeInt(raw)
  })
  return next
}

function normalizeMetricSyncState(value) {
  const fallback = { discharge: {}, outpatient: {}, er: {} }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback
  return {
    discharge: normalizeMonthValueMap(value.discharge),
    outpatient: normalizeMonthValueMap(value.outpatient),
    er: normalizeMonthValueMap(value.er),
  }
}

function distributeValuesToTargetTotal(baseValues, targetTotal) {
  const source = Array.isArray(baseValues) ? baseValues.map((value) => normalizeNonNegativeInt(value)) : []
  if (!source.length) return []

  const target = normalizeNonNegativeInt(targetTotal)
  if (target === 0) {
    return source.map(() => 0)
  }

  const baseTotal = source.reduce((sum, value) => sum + value, 0)
  if (baseTotal === target) {
    return source
  }
  if (baseTotal <= 0) {
    const even = Math.floor(target / source.length)
    let remain = target - (even * source.length)
    return source.map(() => {
      if (remain > 0) {
        remain -= 1
        return even + 1
      }
      return even
    })
  }

  const scaled = source.map((value, idx) => {
    const raw = (value / baseTotal) * target
    const floorValue = Math.floor(raw)
    return {
      idx,
      floorValue,
      fractional: raw - floorValue,
      weight: value,
    }
  })

  let remain = target - scaled.reduce((sum, item) => sum + item.floorValue, 0)
  scaled
    .slice()
    .sort((a, b) => {
      if (b.fractional !== a.fractional) return b.fractional - a.fractional
      if (b.weight !== a.weight) return b.weight - a.weight
      return a.idx - b.idx
    })
    .forEach((item) => {
      if (remain <= 0) return
      scaled[item.idx].floorValue += 1
      remain -= 1
    })

  return scaled.map((item) => item.floorValue)
}

function App() {
  const fileInputRef = useRef(null)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })
  const [reportsByMonth, setReportsByMonth] = useState({})
  const [recentLogs, setRecentLogs] = useState([])
  const [recentUploadedNames, setRecentUploadedNames] = useState([])
  const [residentByYear, setResidentByYear] = useState({ y1: 2, y2: 2, y3: 1, y4: 1 })
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [detailModal, setDetailModal] = useState(DETAIL_MODAL_INITIAL_STATE)
  const [savingCaseChecks, setSavingCaseChecks] = useState({})
  const [editingCaseKey, setEditingCaseKey] = useState('')
  const [editingCaseCodeCounts, setEditingCaseCodeCounts] = useState({})
  const [pendingCaseEdits, setPendingCaseEdits] = useState({})
  const [syncingCaseEdits, setSyncingCaseEdits] = useState(false)
  const [resyncingCases, setResyncingCases] = useState(false)
  const [detailEditError, setDetailEditError] = useState('')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [erScoreModalOpen, setErScoreModalOpen] = useState(false)
  const [surgeryScoreModalOpen, setSurgeryScoreModalOpen] = useState(false)
  const [surgeryScoreState, setSurgeryScoreState] = useState({ loading: false, error: '', data: null })
  const [scoreModalType, setScoreModalType] = useState('discharge')
  const [scoreInputByMonth, setScoreInputByMonth] = useState({})
  const [dischargeScoreInputByMonth, setDischargeScoreInputByMonth] = useState({})
  const [erScoreInputByMonth, setErScoreInputByMonth] = useState({})
  const [metricSyncByMonth, setMetricSyncByMonth] = useState({ discharge: {}, outpatient: {}, er: {} })
  const [rangeStartMonth, setRangeStartMonth] = useState('2025-09')
  const [rangeEndMonth, setRangeEndMonth] = useState('2026-02')
  const [casesMonth, setCasesMonth] = useState('2026-02')
  const [isUploadDragActive, setIsUploadDragActive] = useState(false)
  const [fileLogModalOpen, setFileLogModalOpen] = useState(false)
  const [fileLogPage, setFileLogPage] = useState(1)
  const [fileLogState, setFileLogState] = useState({ loading: false, error: '', items: [], total: 0, totalPages: 1 })
  const [metricView, setMetricView] = useState('discharge')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore storage write failures.
    }
  }, [theme])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SCORE_INPUT_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setScoreInputByMonth(parsed)
      }
    } catch {
      // Ignore malformed localStorage values.
    }
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISCHARGE_SCORE_INPUT_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setDischargeScoreInputByMonth(parsed)
      }
    } catch {
      // Ignore malformed localStorage values.
    }
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ER_SCORE_INPUT_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setErScoreInputByMonth(parsed)
      }
    } catch {
      // Ignore malformed localStorage values.
    }
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(METRIC_SYNC_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      setMetricSyncByMonth(normalizeMetricSyncState(parsed))
    } catch {
      // Ignore malformed localStorage values.
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(SCORE_INPUT_STORAGE_KEY, JSON.stringify(scoreInputByMonth))
    } catch {
      // Ignore storage write failures.
    }
  }, [scoreInputByMonth])

  useEffect(() => {
    try {
      window.localStorage.setItem(DISCHARGE_SCORE_INPUT_STORAGE_KEY, JSON.stringify(dischargeScoreInputByMonth))
    } catch {
      // Ignore storage write failures.
    }
  }, [dischargeScoreInputByMonth])

  useEffect(() => {
    try {
      window.localStorage.setItem(ER_SCORE_INPUT_STORAGE_KEY, JSON.stringify(erScoreInputByMonth))
    } catch {
      // Ignore storage write failures.
    }
  }, [erScoreInputByMonth])

  useEffect(() => {
    try {
      window.localStorage.setItem(METRIC_SYNC_STORAGE_KEY, JSON.stringify(metricSyncByMonth))
    } catch {
      // Ignore storage write failures.
    }
  }, [metricSyncByMonth])

  const monthOptions = useMemo(() => MONTHS.map((m) => ({ key: m, label: m.replace('-', '.') })), [])
  const fixedMonthIndexes = useMemo(() => Object.fromEntries(DISCHARGE_FIXED_MONTH_KEYS.map((month, idx) => [month, idx])), [])
  const rangeStartIndex = MONTHS.indexOf(rangeStartMonth)
  const rangeEndIndex = MONTHS.indexOf(rangeEndMonth)
  const safeRangeStartIndex = rangeStartIndex >= 0 ? rangeStartIndex : 0
  const safeRangeEndIndex = rangeEndIndex >= safeRangeStartIndex ? rangeEndIndex : safeRangeStartIndex
  const selectedMonthKeys = useMemo(
    () => MONTHS.slice(safeRangeStartIndex, safeRangeEndIndex + 1),
    [safeRangeStartIndex, safeRangeEndIndex]
  )
  const selectedMonthSet = useMemo(() => new Set(selectedMonthKeys), [selectedMonthKeys])
  const rangeLabel = useMemo(() => {
    if (!selectedMonthKeys.length) return '-'
    const start = selectedMonthKeys[0].replace('-', '.')
    const end = selectedMonthKeys[selectedMonthKeys.length - 1].replace('-', '.')
    return `${start} ~ ${end}`
  }, [selectedMonthKeys])

  const selectedMonthProfessors = useMemo(() => {
    const professorNames = DISCHARGE_FIXED_ROWS.map((row) => row.professor)
    const monthProfessorRows = reportsByMonth[casesMonth]?.professors || []
    return professorNames.map((name) => {
      const found = monthProfessorRows.find((row) => row.professor_name === name)
      if (found) return found
      return {
        professor_name: name,
        total_general: 0,
        total_local: 0,
        total_bpb: 0,
        total_mac: 0,
        total_snb: 0,
        total_fnb: 0,
        total_spinal: 0,
        total_admission: 0,
        total_discharge: 0,
      }
    })
  }, [reportsByMonth, casesMonth])

  const syncedDischargeByMonth = useMemo(
    () => normalizeMonthValueMap(metricSyncByMonth.discharge),
    [metricSyncByMonth]
  )
  const syncedOutpatientByMonth = useMemo(
    () => normalizeMonthValueMap(metricSyncByMonth.outpatient),
    [metricSyncByMonth]
  )
  const syncedErByMonth = useMemo(
    () => normalizeMonthValueMap(metricSyncByMonth.er),
    [metricSyncByMonth]
  )

  const erSutureBaseMonthlyValues = useMemo(
    () => selectedMonthKeys.map((monthKey) => {
      if (Object.prototype.hasOwnProperty.call(ER_SUTURE_FIXED_BY_MONTH, monthKey)) {
        return ER_SUTURE_FIXED_BY_MONTH[monthKey]
      }
      return Number(reportsByMonth[monthKey]?.outpatient?.total_er_suture) || 0
    }),
    [selectedMonthKeys, reportsByMonth]
  )
  const erSutureMonthlyValues = useMemo(
    () => selectedMonthKeys.map((monthKey, idx) => {
      if (Object.prototype.hasOwnProperty.call(syncedErByMonth, monthKey)) {
        return normalizeNonNegativeInt(syncedErByMonth[monthKey])
      }
      return normalizeNonNegativeInt(erSutureBaseMonthlyValues[idx] || 0)
    }),
    [selectedMonthKeys, syncedErByMonth, erSutureBaseMonthlyValues]
  )
  const erSutureMonthlyTotal = useMemo(
    () => erSutureMonthlyValues.reduce((sum, value) => sum + value, 0),
    [erSutureMonthlyValues]
  )


  const dischargeHeaders = useMemo(
    () => [DISCHARGE_HEADER_FIRST, ...selectedMonthKeys.map((month) => formatMonthLabel(month, true)), DISCHARGE_HEADER_LAST],
    [selectedMonthKeys]
  )
  const dischargeBaseRows = useMemo(() => {
    return DISCHARGE_FIXED_ROWS.map((fixedRow) => {
      const months = selectedMonthKeys.map((monthKey) => {
        if (Object.prototype.hasOwnProperty.call(fixedMonthIndexes, monthKey)) {
          return fixedRow.months[fixedMonthIndexes[monthKey]] || 0
        }
        const apiRow = (reportsByMonth[monthKey]?.professors || []).find((item) => item.professor_name === fixedRow.professor)
        return Number(apiRow?.total_discharge) || 0
      })
      const total = months.reduce((sum, value) => sum + value, 0)
      return { professor: fixedRow.professor, months, total }
    })
  }, [selectedMonthKeys, fixedMonthIndexes, reportsByMonth])
  const dischargeBaseMonthTotals = useMemo(
    () => selectedMonthKeys.map((_, idx) => dischargeBaseRows.reduce((sum, row) => sum + (row.months[idx] || 0), 0)),
    [selectedMonthKeys, dischargeBaseRows]
  )
  const dischargeAppliedMonthTotals = useMemo(
    () => selectedMonthKeys.map((monthKey, idx) => {
      if (Object.prototype.hasOwnProperty.call(syncedDischargeByMonth, monthKey)) {
        return normalizeNonNegativeInt(syncedDischargeByMonth[monthKey])
      }
      return normalizeNonNegativeInt(dischargeBaseMonthTotals[idx] || 0)
    }),
    [selectedMonthKeys, syncedDischargeByMonth, dischargeBaseMonthTotals]
  )
  const dischargeRows = useMemo(() => {
    const rowCount = dischargeBaseRows.length
    if (!rowCount) return []

    const nextMonthsByRow = Array.from({ length: rowCount }, () => [])
    selectedMonthKeys.forEach((_, monthIdx) => {
      const baseColumnValues = dischargeBaseRows.map((row) => Number(row.months[monthIdx] || 0))
      const nextColumnValues = distributeValuesToTargetTotal(baseColumnValues, dischargeAppliedMonthTotals[monthIdx] || 0)
      nextColumnValues.forEach((value, rowIdx) => {
        nextMonthsByRow[rowIdx][monthIdx] = value
      })
    })

    return dischargeBaseRows.map((row, rowIdx) => {
      const months = nextMonthsByRow[rowIdx].map((value) => normalizeNonNegativeInt(value))
      return {
        professor: row.professor,
        months,
        total: months.reduce((sum, value) => sum + value, 0),
      }
    })
  }, [selectedMonthKeys, dischargeBaseRows, dischargeAppliedMonthTotals])
  const dischargeMonthTotals = useMemo(
    () => selectedMonthKeys.map((_, idx) => dischargeRows.reduce((sum, row) => sum + (row.months[idx] || 0), 0)),
    [selectedMonthKeys, dischargeRows]
  )
  const dischargeGrandTotal = useMemo(
    () => dischargeMonthTotals.reduce((sum, value) => sum + value, 0),
    [dischargeMonthTotals]
  )
  const outpatientHeaders = useMemo(
    () => [CLASS_LABEL, ...selectedMonthKeys.map((month) => formatMonthLabel(month, true)), '\uD56D\uBAA9\uBCC4 \uD569\uACC4'],
    [selectedMonthKeys]
  )
  const outpatientBaseRows = useMemo(() => {
    return OUTPATIENT_FIXED_ROWS.map((fixedRow) => {
      const months = selectedMonthKeys.map((monthKey) => {
        if (Object.prototype.hasOwnProperty.call(fixedMonthIndexes, monthKey)) {
          return fixedRow.months[fixedMonthIndexes[monthKey]] || 0
        }
        const outpatient = reportsByMonth[monthKey]?.outpatient || EMPTY_OUTPATIENT
        if (fixedRow.label === '\uCD08\uC9C4') return Number(outpatient.total_first) || 0
        return Number(outpatient.total_re) || 0
      })
      return {
        label: fixedRow.label,
        months,
        total: months.reduce((sum, value) => sum + value, 0),
      }
    })
  }, [selectedMonthKeys, fixedMonthIndexes, reportsByMonth])
  const outpatientBaseMonthTotals = useMemo(
    () => selectedMonthKeys.map((_, idx) => outpatientBaseRows.reduce((sum, row) => sum + (row.months[idx] || 0), 0)),
    [selectedMonthKeys, outpatientBaseRows]
  )
  const outpatientAppliedMonthTotals = useMemo(
    () => selectedMonthKeys.map((monthKey, idx) => {
      if (Object.prototype.hasOwnProperty.call(syncedOutpatientByMonth, monthKey)) {
        return normalizeNonNegativeInt(syncedOutpatientByMonth[monthKey])
      }
      return normalizeNonNegativeInt(outpatientBaseMonthTotals[idx] || 0)
    }),
    [selectedMonthKeys, syncedOutpatientByMonth, outpatientBaseMonthTotals]
  )
  const outpatientRows = useMemo(() => {
    const rowCount = outpatientBaseRows.length
    if (!rowCount) return []

    const nextMonthsByRow = Array.from({ length: rowCount }, () => [])
    selectedMonthKeys.forEach((_, monthIdx) => {
      const baseColumnValues = outpatientBaseRows.map((row) => Number(row.months[monthIdx] || 0))
      const nextColumnValues = distributeValuesToTargetTotal(baseColumnValues, outpatientAppliedMonthTotals[monthIdx] || 0)
      nextColumnValues.forEach((value, rowIdx) => {
        nextMonthsByRow[rowIdx][monthIdx] = value
      })
    })

    return outpatientBaseRows.map((row, rowIdx) => {
      const months = nextMonthsByRow[rowIdx].map((value) => normalizeNonNegativeInt(value))
      return {
        label: row.label,
        months,
        total: months.reduce((sum, value) => sum + value, 0),
      }
    })
  }, [selectedMonthKeys, outpatientBaseRows, outpatientAppliedMonthTotals])
  const outpatientMonthTotals = useMemo(
    () => selectedMonthKeys.map((_, idx) => outpatientRows.reduce((sum, row) => sum + (row.months[idx] || 0), 0)),
    [selectedMonthKeys, outpatientRows]
  )
  const outpatientGrandTotal = useMemo(
    () => outpatientMonthTotals.reduce((sum, value) => sum + value, 0),
    [outpatientMonthTotals]
  )

  const residentTotal = Object.values(residentByYear).reduce((acc, cur) => acc + (Number(cur) || 0), 0)
  const residentYearCount = Object.values(residentByYear).filter((v) => Number(v) > 0).length
  const convertedScore = residentYearCount > 0 ? (residentTotal / residentYearCount) : 0
  const scoreSourceLabel = scoreModalType === 'discharge' ? '\uD1F4\uC6D0 \uD658\uC790 \uC218' : '\uC678\uB798 \uD658\uC790 \uC218'
  const categoryModalTitle = scoreModalType === 'outpatient'
    ? '\uC678\uB798 \uD658\uC790 \uC218 \uC810\uC218'
    : scoreModalType === 'discharge'
      ? '\uD1F4\uC6D0 \uD658\uC790 \uC218 \uC810\uC218'
      : CATEGORY_MODAL_TITLE
  const scoreDefaultByMonth = useMemo(
    () => Object.fromEntries(selectedMonthKeys.map((month, idx) => [month, Number(outpatientBaseMonthTotals[idx] || 0)])),
    [selectedMonthKeys, outpatientBaseMonthTotals]
  )
  const dischargeScoreDefaultByMonth = useMemo(
    () => Object.fromEntries(selectedMonthKeys.map((month, idx) => [month, Number(dischargeBaseMonthTotals[idx] || 0)])),
    [selectedMonthKeys, dischargeBaseMonthTotals]
  )
  const activeScoreDefaults = scoreModalType === 'discharge' ? dischargeScoreDefaultByMonth : scoreDefaultByMonth
  const activeScoreInputs = scoreModalType === 'discharge' ? dischargeScoreInputByMonth : scoreInputByMonth
  const activeScoreSyncedByMonth = scoreModalType === 'discharge' ? syncedDischargeByMonth : syncedOutpatientByMonth
  const editableMonthlyRows = useMemo(
    () => selectedMonthKeys.map((month) => ({
      month,
      defaultValue: Number(activeScoreDefaults[month] || 0),
      value: Number(activeScoreInputs[month] ?? activeScoreSyncedByMonth[month] ?? activeScoreDefaults[month] ?? 0),
    })),
    [selectedMonthKeys, activeScoreDefaults, activeScoreInputs, activeScoreSyncedByMonth]
  )
  const scorePeriodSum = useMemo(
    () => editableMonthlyRows.reduce((sum, row) => sum + (Number(row.value) || 0), 0),
    [editableMonthlyRows]
  )
  const scoreMonthsCount = selectedMonthKeys.length || 1
  const annualizeFactor = 12 / scoreMonthsCount
  const annualizedOutpatient = scorePeriodSum * annualizeFactor
  const convertedOutpatientN = annualizedOutpatient
  const convertedOutpatientNInt = Math.floor(convertedOutpatientN)
  const thresholdMultiplier = convertedScore
  const scoreCriteriaBaseRows = scoreModalType === 'discharge' ? SCORE_BASE_ROWS : SCORE_BASE_ROWS_OUTPATIENT
  const scoreRows = useMemo(() => {
    return scoreCriteriaBaseRows.map((row) => {
      const convertedMin = Math.floor(row.min * thresholdMultiplier)
      const convertedMax = Number.isFinite(row.max) ? Math.floor(row.max * thresholdMultiplier) : Number.POSITIVE_INFINITY
      const convertedUpperExclusive = Number.isFinite(row.max)
        ? Math.floor((row.max + 1) * thresholdMultiplier)
        : Number.POSITIVE_INFINITY
      const isMatched = convertedOutpatientNInt >= convertedMin && (Number.isFinite(convertedMax) ? convertedOutpatientNInt <= convertedMax : true)
      return { ...row, convertedMin, convertedMax, convertedUpperExclusive, isMatched }
    })
  }, [scoreCriteriaBaseRows, convertedOutpatientNInt, thresholdMultiplier])
  const matchedScore = scoreRows.find((row) => row.isMatched)?.score ?? 0
  const isSupportedScoreModalType = scoreModalType === 'discharge' || scoreModalType === 'outpatient'
  const showNextStepHint = ENABLE_SCORE_NEXT_STEP_HINT && isSupportedScoreModalType
  const neededOneMonthByRowId = useMemo(() => {
    if (!showNextStepHint) return {}
    const nextMap = {}
    scoreRows.forEach((row) => {
      if (row.score <= matchedScore) return
      const targetConvertedMin = Number(row.convertedMin) || 0
      const needed = Math.ceil((targetConvertedMin * (scoreMonthsCount + 1)) / 12 - scorePeriodSum)
      nextMap[row.id] = Math.max(0, needed)
    })
    return nextMap
  }, [showNextStepHint, scoreRows, matchedScore, scoreMonthsCount, scorePeriodSum])
  const hasHigherScoreRows = useMemo(
    () => Object.keys(neededOneMonthByRowId).length > 0,
    [neededOneMonthByRowId]
  )
  const erScoreDefaultByMonth = useMemo(
    () => Object.fromEntries(selectedMonthKeys.map((month, idx) => [month, Number(erSutureBaseMonthlyValues[idx] || 0)])),
    [selectedMonthKeys, erSutureBaseMonthlyValues]
  )
  const erEditableMonthlyRows = useMemo(
    () => selectedMonthKeys.map((month) => ({
      month,
      defaultValue: Number(erScoreDefaultByMonth[month] || 0),
      value: Number(erScoreInputByMonth[month] ?? syncedErByMonth[month] ?? erScoreDefaultByMonth[month] ?? 0),
    })),
    [selectedMonthKeys, erScoreDefaultByMonth, erScoreInputByMonth, syncedErByMonth]
  )
  const erScorePeriodSum = useMemo(
    () => erEditableMonthlyRows.reduce((sum, row) => sum + (Number(row.value) || 0), 0),
    [erEditableMonthlyRows]
  )
  const erSutureAnnualized = erScorePeriodSum * annualizeFactor
  const erPerResident = residentTotal > 0 ? (erSutureAnnualized / residentTotal) : 0
  const erScoreRows = useMemo(() => {
    return ER_SCORE_ROWS.map((row) => {
      const isMatched = erPerResident >= row.min && (Number.isFinite(row.max) ? erPerResident <= row.max : true)
      return { ...row, isMatched }
    })
  }, [erPerResident])
  const erMatchedScore = erScoreRows.find((row) => row.isMatched)?.score ?? 0
  const hasPendingCategoryScoreSync = useMemo(
    () => editableMonthlyRows.some((row) => {
      const currentApplied = Object.prototype.hasOwnProperty.call(activeScoreSyncedByMonth, row.month)
        ? normalizeNonNegativeInt(activeScoreSyncedByMonth[row.month])
        : normalizeNonNegativeInt(activeScoreDefaults[row.month] || 0)
      return normalizeNonNegativeInt(row.value) !== currentApplied
    }),
    [editableMonthlyRows, activeScoreSyncedByMonth, activeScoreDefaults]
  )
  const hasPendingErScoreSync = useMemo(
    () => erEditableMonthlyRows.some((row) => {
      const currentApplied = Object.prototype.hasOwnProperty.call(syncedErByMonth, row.month)
        ? normalizeNonNegativeInt(syncedErByMonth[row.month])
        : normalizeNonNegativeInt(erScoreDefaultByMonth[row.month] || 0)
      return normalizeNonNegativeInt(row.value) !== currentApplied
    }),
    [erEditableMonthlyRows, syncedErByMonth, erScoreDefaultByMonth]
  )
  const surgeryScoreRows = useMemo(
    () => Array.isArray(surgeryScoreState.data?.rows) ? surgeryScoreState.data.rows : [],
    [surgeryScoreState.data]
  )
  const surgeryScoreMonths = useMemo(
    () => Array.isArray(surgeryScoreState.data?.months) ? surgeryScoreState.data.months : selectedMonthKeys,
    [surgeryScoreState.data, selectedMonthKeys]
  )
  const surgeryScoreMonthTotals = useMemo(
    () => Array.isArray(surgeryScoreState.data?.totals?.monthly_raw_totals)
      ? surgeryScoreState.data.totals.monthly_raw_totals
      : surgeryScoreMonths.map((_, idx) => surgeryScoreRows.reduce((sum, row) => sum + (row.monthly_counts?.[idx] || 0), 0)),
    [surgeryScoreState.data, surgeryScoreMonths, surgeryScoreRows]
  )
  const surgeryScoreGrandTotal = useMemo(
    () => Number(surgeryScoreState.data?.totals?.total_raw_sum ?? surgeryScoreMonthTotals.reduce((sum, value) => sum + value, 0)),
    [surgeryScoreState.data, surgeryScoreMonthTotals]
  )
  const surgeryScoreTotal = useMemo(
    () => surgeryScoreRows.reduce((sum, row) => sum + Number(row.score || 0), 0),
    [surgeryScoreRows]
  )
  const pendingCaseEditEntriesForMonth = useMemo(
    () => Object.entries(pendingCaseEdits).filter(([, item]) => item?.month === casesMonth),
    [pendingCaseEdits, casesMonth]
  )
  const hasPendingCaseEditsForMonth = pendingCaseEditEntriesForMonth.length > 0

  function caseRowKey(caseRow, professorName = detailModal.professor) {
    return [
      String(caseRow?.date || ''),
      String(professorName || ''),
      String(caseRow?.patient_name || ''),
      String(caseRow?.case_name || ''),
      String(caseRow?.anesthesia || ''),
    ].join('||')
  }

  function normalizeManualCodeCounts(value) {
    const next = {}
    const codeSet = new Set(DIAGNOSIS_CODE_OPTIONS.map((item) => item.code))

    if (Array.isArray(value)) {
      value.forEach((rawCode) => {
        const code = String(rawCode || '').trim().toUpperCase()
        if (!codeSet.has(code)) return
        next[code] = (next[code] || 0) + 1
      })
      return next
    }

    if (value && typeof value === 'object') {
      DIAGNOSIS_CODE_OPTIONS.forEach(({ code }) => {
        const parsed = Math.max(0, Math.floor(Number(value[code]) || 0))
        if (parsed > 0) {
          next[code] = parsed
        }
      })
    }

    return next
  }

  function areCodeCountsEqual(a, b) {
    const first = normalizeManualCodeCounts(a)
    const second = normalizeManualCodeCounts(b)
    const keys = Array.from(new Set([...Object.keys(first), ...Object.keys(second)])).sort()
    return keys.every((key) => Number(first[key] || 0) === Number(second[key] || 0))
  }

  function extractBaseDiagnosisCodeCounts(code) {
    const upper = String(code || '').trim().toUpperCase()
    if (!upper || upper === 'UNKNOWN' || upper === '-') return {}
    const leadingMatch = upper.match(/^\s*([A-K])(?:[\s\.\)\]\-:：]|$)/)
    if (leadingMatch) return { [leadingMatch[1]]: 1 }
    return DIAGNOSIS_CODE_OPTIONS.some((item) => item.code === upper) ? { [upper]: 1 } : {}
  }

  function formatDiagnosisCodeCounts(codeCounts) {
    const normalized = normalizeManualCodeCounts(codeCounts)
    return DIAGNOSIS_CODE_OPTIONS
      .filter(({ code }) => normalized[code] > 0)
      .map(({ code, label }) => `${label} (${normalized[code]})`)
      .join(' · ')
  }

  function getPersistedCaseCodeCounts(caseRow) {
    return normalizeManualCodeCounts(caseRow?.manual_classification_counts || caseRow?.manual_classifications)
  }

  function getDraftCaseCodeCounts(caseRow, professorName = detailModal.professor) {
    const key = caseRowKey(caseRow, professorName)
    const draft = pendingCaseEdits[key]
    if (!draft || draft.month !== casesMonth) return null
    return normalizeManualCodeCounts(draft.diagnosis_code_counts)
  }

  function getEffectiveCaseCodeCounts(caseRow, professorName = detailModal.professor) {
    const draftCounts = getDraftCaseCodeCounts(caseRow, professorName)
    if (draftCounts) return draftCounts
    return getPersistedCaseCodeCounts(caseRow)
  }

  function getDisplayedDiagnosisText(caseRow, manualCounts = null) {
    const manualCountsNormalized = manualCounts
      ? normalizeManualCodeCounts(manualCounts)
      : getEffectiveCaseCodeCounts(caseRow)
    if (Object.keys(manualCountsNormalized).length > 0) {
      return formatDiagnosisCodeCounts(manualCountsNormalized)
    }
    return diagnosisLabel(caseRow?.diagnosis_code)
  }

  function closeDetailModal() {
    setDetailModal(DETAIL_MODAL_INITIAL_STATE)
    setSavingCaseChecks({})
    setEditingCaseKey('')
    setEditingCaseCodeCounts({})
    setDetailEditError('')
  }

  async function fetchSurgeryScoreData() {
    const res = await api.get(`${API_BASE}/api/category-score`, {
      params: {
        start_month: rangeStartMonth,
        end_month: rangeEndMonth,
        multiplier: annualizeFactor,
      },
    })
    return res.data
  }

  function startCaseClassificationEdit(caseRow) {
    const key = caseRowKey(caseRow)
    const draftCounts = getDraftCaseCodeCounts(caseRow)
    const initialCounts = draftCounts !== null ? draftCounts : getPersistedCaseCodeCounts(caseRow)
    const fallbackCounts = extractBaseDiagnosisCodeCounts(caseRow?.diagnosis_code)
    setEditingCaseKey(key)
    setEditingCaseCodeCounts(Object.keys(initialCounts).length > 0 ? initialCounts : fallbackCounts)
    setDetailEditError('')
  }

  function cancelCaseClassificationEdit() {
    setEditingCaseKey('')
    setEditingCaseCodeCounts({})
    setDetailEditError('')
  }

  function adjustEditingDiagnosisCodeCount(code, delta) {
    const normalized = String(code || '').trim().toUpperCase()
    if (!DIAGNOSIS_CODE_OPTIONS.some((item) => item.code === normalized)) return
    const step = Number(delta) || 0
    if (!step) return
    setEditingCaseCodeCounts((prev) => {
      const current = Math.max(0, Math.floor(Number(prev[normalized]) || 0))
      const nextValue = Math.min(9, Math.max(0, current + step))
      const next = { ...prev }
      if (nextValue > 0) {
        next[normalized] = nextValue
      } else {
        delete next[normalized]
      }
      return next
    })
  }

  async function fetchDashboard() {
    const monthKeys = MONTHS.join(',')
    const res = await api.get(`${API_BASE}/api/dashboard`, { params: { months: monthKeys } })
    setReportsByMonth(res.data.reports || {})
    setRecentLogs(res.data.recentLogs || [])
  }

  async function fetchFileLogsPage(page) {
    const targetPage = Math.max(1, Number(page) || 1)
    setFileLogState((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const res = await api.get(`${API_BASE}/api/logs`, {
        params: {
          page: targetPage,
          pageSize: FILE_LOG_PAGE_SIZE,
        },
      })
      const payload = res.data || {}
      const totalPages = Math.max(1, Number(payload.totalPages || 1))
      const safePage = Math.min(targetPage, totalPages)
      if (safePage !== targetPage) {
        setFileLogPage(safePage)
      }
      setFileLogState({
        loading: false,
        error: '',
        items: Array.isArray(payload.items) ? payload.items : [],
        total: Number(payload.total || 0),
        totalPages,
      })
    } catch (err) {
      setFileLogState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'Load failed',
      }))
    }
  }

  useEffect(() => {
    fetchDashboard().catch((err) => setMessage(err.message))
  }, [])

  useEffect(() => {
    if (!fileLogModalOpen) return
    fetchFileLogsPage(fileLogPage).catch(() => {})
  }, [fileLogModalOpen, fileLogPage])

  useEffect(() => {
    if (!surgeryScoreModalOpen) return
    let active = true

    async function fetchSurgeryScore() {
      setSurgeryScoreState((prev) => ({ ...prev, loading: true, error: '' }))
      try {
        const data = await fetchSurgeryScoreData()
        if (!active) return
        setSurgeryScoreState({ loading: false, error: '', data })
      } catch (err) {
        if (!active) return
        setSurgeryScoreState({ loading: false, error: err.message || 'Load failed', data: null })
      }
    }

    fetchSurgeryScore()
    return () => { active = false }
  }, [surgeryScoreModalOpen, rangeStartMonth, rangeEndMonth, annualizeFactor])

  useEffect(() => {
    if (!selectedMonthSet.has(casesMonth)) {
      setCasesMonth(rangeEndMonth)
    }
  }, [casesMonth, selectedMonthSet, rangeEndMonth])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const hasModalOpen = detailModal.show || categoryModalOpen || erScoreModalOpen || surgeryScoreModalOpen || fileLogModalOpen
    if (hasModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = originalOverflow || ''
    }
    return () => {
      document.body.style.overflow = originalOverflow || ''
    }
  }, [detailModal.show, categoryModalOpen, erScoreModalOpen, surgeryScoreModalOpen, fileLogModalOpen])

  async function uploadFiles(rawFiles) {
    const files = Array.from(rawFiles || [])
    if (!files.length) return
    if (uploading) return

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    setRecentUploadedNames(files.map((file) => file.name))

    setUploading(true)
    setMessage('')
    try {
      const res = await api.post(`${API_BASE}/api/upload-multiple`, formData)
      const successCount = res?.data?.successCount ?? 0
      const failCount = res?.data?.failCount ?? 0
      setMessage(`Upload completed. Success: ${successCount}, Failed: ${failCount}`)
      await fetchDashboard()
      if (fileLogModalOpen) {
        await fetchFileLogsPage(fileLogPage)
      }
    } catch (err) {
      setMessage('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleFileUpload(e) {
    try {
      await uploadFiles(e.target.files)
    } finally {
      e.target.value = ''
    }
  }

  function handleUploadDragEnter(e) {
    e.preventDefault()
    if (uploading) return
    setIsUploadDragActive(true)
  }

  function handleUploadDragOver(e) {
    e.preventDefault()
    if (uploading) return
    if (!isUploadDragActive) {
      setIsUploadDragActive(true)
    }
  }

  function handleUploadDragLeave(e) {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsUploadDragActive(false)
    }
  }

  async function handleUploadDrop(e) {
    e.preventDefault()
    setIsUploadDragActive(false)
    if (uploading) return
    await uploadFiles(e.dataTransfer?.files)
  }

  function openFilePicker() {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  async function showCases(professor) {
    try {
      const res = await api.get(`${API_BASE}/api/cases/${casesMonth}/${professor}`)
      setDetailModal({ show: true, professor, cases: res.data || [] })
      setSavingCaseChecks({})
      setEditingCaseKey('')
      setEditingCaseCodeCounts({})
      setDetailEditError('')
    } catch (err) {
      setMessage('Case load failed: ' + err.message)
    }
  }

  function saveCaseClassifications(caseRow) {
    const rowKey = caseRowKey(caseRow)
    const diagnosisCodeCounts = normalizeManualCodeCounts(editingCaseCodeCounts)
    setDetailEditError('')

    const persistedCounts = getPersistedCaseCodeCounts(caseRow)
    const draftPayload = {
      month: casesMonth,
      date: caseRow.date,
      professor_name: detailModal.professor,
      patient_name: caseRow.patient_name,
      case_name: caseRow.case_name,
      anesthesia: caseRow.anesthesia || '',
      diagnosis_code_counts: diagnosisCodeCounts,
    }

    setPendingCaseEdits((prev) => {
      const next = { ...prev }
      if (areCodeCountsEqual(persistedCounts, diagnosisCodeCounts)) {
        delete next[rowKey]
      } else {
        next[rowKey] = draftPayload
      }
      return next
    })
    cancelCaseClassificationEdit()
    setMessage('임시 저장됨. 상단 Sync로 확정하세요.')
  }

  async function refreshSurgeryScoreIfOpen() {
    if (!surgeryScoreModalOpen) return
    setSurgeryScoreState((prev) => ({ ...prev, loading: true, error: '' }))
    try {
      const data = await fetchSurgeryScoreData()
      setSurgeryScoreState({ loading: false, error: '', data })
    } catch (err) {
      setSurgeryScoreState({ loading: false, error: err.message || 'Load failed', data: null })
    }
  }

  async function handleSyncCaseEdits() {
    if (syncingCaseEdits || resyncingCases) return
    const entries = Object.entries(pendingCaseEdits).filter(([, item]) => item?.month === casesMonth)
    if (!entries.length) return

    setSyncingCaseEdits(true)
    try {
      const items = entries.map(([, item]) => item)
      const res = await api.put(`${API_BASE}/api/cases/classifications/bulk`, {
        month: casesMonth,
        items,
      })

      const keysToRemove = new Set(entries.map(([key]) => key))
      setPendingCaseEdits((prev) => {
        const next = { ...prev }
        keysToRemove.forEach((key) => delete next[key])
        return next
      })

      if (detailModal.show && detailModal.professor) {
        await showCases(detailModal.professor)
      }
      await refreshSurgeryScoreIfOpen()
      setMessage(`Sync 완료 (${Number(res.data?.saved_count || items.length)}건)`)
    } catch (err) {
      setMessage('Sync failed: ' + err.message)
    } finally {
      setSyncingCaseEdits(false)
    }
  }

  async function handleResyncCases() {
    if (syncingCaseEdits || resyncingCases) return
    const monthLabel = casesMonth.replace('-', '.')
    const okToReset = window.confirm(`${monthLabel} 월의 수동 분류를 원본으로 되돌리시겠습니까?`)
    if (!okToReset) return

    setResyncingCases(true)
    try {
      const res = await api.post(`${API_BASE}/api/cases/classifications/resync`, {
        month: casesMonth,
      })

      setPendingCaseEdits((prev) => {
        const next = { ...prev }
        Object.keys(next).forEach((key) => {
          if (next[key]?.month === casesMonth) {
            delete next[key]
          }
        })
        return next
      })

      if (detailModal.show && detailModal.professor) {
        await showCases(detailModal.professor)
      }
      await refreshSurgeryScoreIfOpen()
      setMessage(`Resync 완료 (${Number(res.data?.deleted_count || 0)}건 초기화)`)
    } catch (err) {
      setMessage('Resync failed: ' + err.message)
    } finally {
      setResyncingCases(false)
    }
  }

  async function handleDeleteLog(date) {
    if (!window.confirm(`Delete ${date}?`)) return
    try {
      await api.delete(`${API_BASE}/api/logs/${date}`)
      await fetchDashboard()
      if (fileLogModalOpen) {
        await fetchFileLogsPage(fileLogPage)
      }
    } catch (err) {
      setMessage('Delete failed: ' + err.message)
    }
  }

  function handleRangeStartChange(value) {
    const nextStartIndex = MONTHS.indexOf(value)
    const currentEndIndex = MONTHS.indexOf(rangeEndMonth)
    setRangeStartMonth(value)
    if (nextStartIndex > currentEndIndex) {
      setRangeEndMonth(value)
    }
  }

  function handleRangeEndChange(value) {
    setRangeEndMonth(value)
  }

  function handleCasesMonthChange(value) {
    setCasesMonth(value)
  }

  function openCategoryScore(type = 'discharge') {
    setScoreModalType(type)
    setCategoryModalOpen(true)
  }

  function applyMetricSync(view, monthValueMap, baseByMonth) {
    const normalizedMonthValueMap = normalizeMonthValueMap(monthValueMap)
    setMetricSyncByMonth((prev) => {
      const safePrev = normalizeMetricSyncState(prev)
      const nextViewValues = { ...(safePrev[view] || {}) }
      selectedMonthKeys.forEach((month) => {
        const nextValue = normalizeNonNegativeInt(normalizedMonthValueMap[month] || 0)
        const baseValue = normalizeNonNegativeInt(baseByMonth[month] || 0)
        if (nextValue === baseValue) {
          delete nextViewValues[month]
        } else {
          nextViewValues[month] = nextValue
        }
      })
      return { ...safePrev, [view]: nextViewValues }
    })
  }

  function handleSyncCategoryScoreInputs() {
    const targetView = scoreModalType === 'discharge' ? 'discharge' : 'outpatient'
    const baseByMonth = targetView === 'discharge' ? dischargeScoreDefaultByMonth : scoreDefaultByMonth
    const monthValueMap = Object.fromEntries(
      editableMonthlyRows.map((row) => [row.month, normalizeNonNegativeInt(row.value)])
    )
    applyMetricSync(targetView, monthValueMap, baseByMonth)
    setMessage('지표 Sync 완료: 바깥 표에 반영되었습니다.')
  }

  function handleSyncErScoreInputs() {
    const monthValueMap = Object.fromEntries(
      erEditableMonthlyRows.map((row) => [row.month, normalizeNonNegativeInt(row.value)])
    )
    applyMetricSync('er', monthValueMap, erScoreDefaultByMonth)
    setMessage('ER Sync 완료: 바깥 표에 반영되었습니다.')
  }

  function updateScoreInput(monthKey, nextValue) {
    const parsed = normalizeNonNegativeInt(nextValue)
    if (scoreModalType === 'discharge') {
      setDischargeScoreInputByMonth((prev) => ({ ...prev, [monthKey]: parsed }))
      return
    }
    setScoreInputByMonth((prev) => ({ ...prev, [monthKey]: parsed }))
  }

  function resetScoreInputs() {
    const nextInputs = {}
    selectedMonthKeys.forEach((month) => {
      nextInputs[month] = normalizeNonNegativeInt(activeScoreDefaults[month] || 0)
    })
    if (scoreModalType === 'discharge') {
      setDischargeScoreInputByMonth((prev) => ({ ...prev, ...nextInputs }))
      return
    }
    setScoreInputByMonth((prev) => ({ ...prev, ...nextInputs }))
  }

  function updateErScoreInput(monthKey, nextValue) {
    const parsed = normalizeNonNegativeInt(nextValue)
    setErScoreInputByMonth((prev) => ({ ...prev, [monthKey]: parsed }))
  }

  function resetErScoreInputs() {
    const nextInputs = {}
    selectedMonthKeys.forEach((month) => {
      nextInputs[month] = normalizeNonNegativeInt(erScoreDefaultByMonth[month] || 0)
    })
    setErScoreInputByMonth((prev) => ({ ...prev, ...nextInputs }))
  }

  function formatConvertedRange(row) {
    if (!Number.isFinite(row.convertedMax)) {
      return `${row.convertedMin}\uBA85 \uC774\uC0C1`
    }
    if (row.min === 0) {
      return `${row.convertedUpperExclusive}\uBA85 \uBBF8\uB9CC`
    }
    return `${row.convertedMin} ~ ${row.convertedMax}\uBA85`
  }

  function updateResidentByYear(key, value) {
    const parsed = normalizeNonNegativeInt(value)
    setResidentByYear((prev) => ({ ...prev, [key]: parsed }))
  }

  function formatCaseName(caseName) {
    return String(caseName || '').trim()
  }

  function diagnosisLabel(code) {
    const key = String(code || '').trim().toUpperCase()
    if (!key || key === 'UNKNOWN') return '-'
    return DIAGNOSIS_LABEL_BY_CODE[key] || key
  }

  function surgeryCategoryLabel(row) {
    const key = String(row?.category_key || '')
    return SURGERY_CATEGORY_LABEL_BY_KEY[key] || row?.category_label || key || '-'
  }

  function surgeryCriteriaText(row) {
    const min01 = Number(row?.threshold?.min_for_01 ?? 0)
    const max01 = Number(row?.threshold?.max_for_01 ?? 0)
    const min02 = Number(row?.threshold?.min_for_02 ?? 0)
    return `① ${min01}-${max01}건 / ② ${min02}건 이상`
  }

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  function openFileLogModal() {
    setFileLogPage(1)
    setFileLogModalOpen(true)
  }

  function openMetricScoreModal(view) {
    if (view === 'er') {
      setErScoreModalOpen(true)
      return
    }
    openCategoryScore(view)
  }

  async function toggleCaseRowSelected(caseRow) {
    const rowKey = caseRowKey(caseRow)
    if (savingCaseChecks[rowKey]) return

    const nextChecked = !caseRow.case_checked
    setSavingCaseChecks((prev) => ({ ...prev, [rowKey]: true }))
    setDetailModal((prev) => ({
      ...prev,
      cases: (prev.cases || []).map((item) => (caseRowKey(item) === rowKey ? { ...item, case_checked: nextChecked } : item)),
    }))

    try {
      await api.put(`${API_BASE}/api/cases/check`, {
        date: caseRow.date,
        professor_name: detailModal.professor,
        patient_name: caseRow.patient_name,
        case_name: caseRow.case_name,
        anesthesia: caseRow.anesthesia || '',
        is_checked: nextChecked,
      })
    } catch (err) {
      setDetailModal((prev) => ({
        ...prev,
        cases: (prev.cases || []).map((item) => (caseRowKey(item) === rowKey ? { ...item, case_checked: !nextChecked } : item)),
      }))
      setMessage('체크 저장 실패: ' + err.message)
    } finally {
      setSavingCaseChecks((prev) => {
        const next = { ...prev }
        delete next[rowKey]
        return next
      })
    }
  }

  return (
    <div className="container">
      <header>
        <div className="header-topbar">
          <button type="button" className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
        <h1>📊 YUMC PS</h1>
        <div className="header-intro">
          <p className="header-subtitle">{SUBTITLE_TEXT}</p>
          <div className="resident-config">
            <div className="resident-config-title">{'\uC804\uACF5\uC758 \uC218 \uC124\uC815'}</div>
            <div className="resident-config-summary">
              {SCORE_PREFIX} {residentTotal} / {YEAR_COUNT_LABEL} {residentYearCount}{residentYearCount > 0 ? ` = ${convertedScore.toFixed(2)}` : ''}
            </div>
            <div className="resident-config-inputs">
              <label className="resident-year-item">
                <span className="resident-year-label">{YEAR_LABELS[0]}</span>
                <input type="number" min="0" step="1" value={residentByYear.y1} onChange={(e) => updateResidentByYear('y1', e.target.value)} />
              </label>
              <label className="resident-year-item">
                <span className="resident-year-label">{YEAR_LABELS[1]}</span>
                <input type="number" min="0" step="1" value={residentByYear.y2} onChange={(e) => updateResidentByYear('y2', e.target.value)} />
              </label>
              <label className="resident-year-item">
                <span className="resident-year-label">{YEAR_LABELS[2]}</span>
                <input type="number" min="0" step="1" value={residentByYear.y3} onChange={(e) => updateResidentByYear('y3', e.target.value)} />
              </label>
              <label className="resident-year-item">
                <span className="resident-year-label">{YEAR_LABELS[3]}</span>
                <input type="number" min="0" step="1" value={residentByYear.y4} onChange={(e) => updateResidentByYear('y4', e.target.value)} />
              </label>
            </div>
          </div>
        </div>
        <div className="range-toolbar header-range-toolbar">
          <div className="range-controls">
            <div className="range-control">
              <label>Start Month</label>
              <select value={rangeStartMonth} onChange={(e) => handleRangeStartChange(e.target.value)}>
                {monthOptions.map((option) => (
                  <option key={`start-${option.key}`} value={option.key}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="range-control">
              <label>End Month</label>
              <select value={rangeEndMonth} onChange={(e) => handleRangeEndChange(e.target.value)}>
                {monthOptions
                  .filter((option) => MONTHS.indexOf(option.key) >= MONTHS.indexOf(rangeStartMonth))
                  .map((option) => (
                    <option key={`end-${option.key}`} value={option.key}>{option.label}</option>
                  ))}
              </select>
            </div>
            <div className="range-pill">{rangeLabel}</div>
          </div>
        </div>
      </header>

      <div className="kpi-summary-row">
        <div className="kpi-card">
          <span className="kpi-icon">🏥</span>
          <div className="kpi-info">
            <span className="kpi-label">퇴원환자 합계</span>
            <strong className="kpi-value">{dischargeGrandTotal.toLocaleString()}<span className="kpi-unit">명</span></strong>
          </div>
        </div>
        <div className="kpi-card">
          <span className="kpi-icon">🩺</span>
          <div className="kpi-info">
            <span className="kpi-label">외래환자 합계</span>
            <strong className="kpi-value">{outpatientGrandTotal.toLocaleString()}<span className="kpi-unit">명</span></strong>
          </div>
        </div>
        <div className="kpi-card">
          <span className="kpi-icon">🚑</span>
          <div className="kpi-info">
            <span className="kpi-label">ER Suture</span>
            <strong className="kpi-value">{erSutureMonthlyTotal.toLocaleString()}<span className="kpi-unit">건</span></strong>
          </div>
        </div>
        <div className="kpi-card">
          <span className="kpi-icon">👨‍⚕️</span>
          <div className="kpi-info">
            <span className="kpi-label">전공의 수</span>
            <strong className="kpi-value">{residentTotal}<span className="kpi-unit">명</span></strong>
          </div>
        </div>
      </div>

      <div className="top-half-row">
        <section className="card" style={{ marginBottom: '1rem' }}>
          <div className="surgery-card-header">
            <h2>{'\uB2F9\uC9C1\uC77C\uC9C0 \uC5C5\uB85C\uB4DC'}</h2>
            <button type="button" className="btn btn-subtle upload-log-open-btn" onClick={openFileLogModal}>
              {'\uD30C\uC77C\uB85C\uADF8 \uBCF4\uAE30'}
            </button>
          </div>
          <div className="upload-banner">
            <div
              className={`upload-dropzone${isUploadDragActive ? ' is-dragging' : ''}`}
              onClick={openFilePicker}
              onDragEnter={handleUploadDragEnter}
              onDragOver={handleUploadDragOver}
              onDragLeave={handleUploadDragLeave}
              onDrop={handleUploadDrop}
            >
              <div className="upload-dropzone-title">XLSX Upload</div>
              <p className="upload-dropzone-note">Click or drag files here to upload daily logs.</p>
              <button type="button" className="btn" onClick={(e) => { e.stopPropagation(); openFilePicker() }} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Select Files'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="upload-hidden-input"
              />
            </div>

            {recentUploadedNames.length > 0 && (
              <div className="upload-filelog">
                <strong>Selected:</strong> {recentUploadedNames.join(', ')}
              </div>
            )}
            <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>{message}</p>
            <div className="upload-guide">
              <h3>{'\uC5C5\uB85C\uB4DC \uC548\uB0B4'}</h3>
              <ul>
                <li>{'.xlsx \uD30C\uC77C\uB9CC \uC5C5\uB85C\uB4DC \uAC00\uB2A5'}</li>
                <li>{'\uC5EC\uB7EC \uD30C\uC77C \uB3D9\uC2DC \uC120\uD0DD/\uB4DC\uB798\uADF8 \uAC00\uB2A5'}</li>
                <li>{'\uC5C5\uB85C\uB4DC \uACB0\uACFC\uB294 \uC624\uB978\uCABD \uD30C\uC77C\uB85C\uADF8 \uBAA8\uB2EC\uC5D0\uC11C \uD655\uC778 \uAC00\uB2A5'}</li>
                <li>{'\uD544\uC694 \uC2DC \uD30C\uC77C\uB85C\uADF8\uC5D0\uC11C \uB0A0\uC9DC\uBCC4 \uC0AD\uC81C \uAC00\uB2A5'}</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="card" style={{ marginBottom: '1rem' }}>
          <div className="surgery-card-header">
            <h2>{'\uC218\uC220 \uC6D4\uBCC4 \uC694\uC57D \uBC0F \uC0C1\uC138'} ({casesMonth.replace('-', '.')})</h2>
            <div className="surgery-card-actions">
              <button className="btn btn-subtle score-check-btn" onClick={() => setSurgeryScoreModalOpen(true)}>
                {SURGERY_SCORE_BUTTON_LABEL}
              </button>
            </div>
          </div>
          <div className="surgery-note-row">
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 0 }}>
              {'* \uAD50\uC218\uB2D8 \uC131\uD568 \uD074\uB9AD \uC2DC \uC0C1\uC138 \uD655\uC778 \uAC00\uB2A5'}
            </p>
            <div className="surgery-note-actions">
              <button
                type="button"
                className="btn btn-subtle header-sync-btn"
                onClick={handleSyncCaseEdits}
                disabled={!hasPendingCaseEditsForMonth || syncingCaseEdits || resyncingCases}
                title="선택 월 변경사항 Sync 저장"
                aria-label="선택 월 변경사항 Sync 저장"
              >
                {syncingCaseEdits ? '...' : '⟳'}
              </button>
              <button
                type="button"
                className="btn btn-subtle header-sync-btn"
                onClick={handleResyncCases}
                disabled={syncingCaseEdits || resyncingCases}
                title="선택 월 분류 원본 복원"
                aria-label="선택 월 분류 원본 복원"
              >
                {resyncingCases ? '...' : '↺'}
              </button>
            </div>
          </div>
          <div className="surgery-month-tools">
            <div className="month-selector">
              {selectedMonthKeys.map((month) => (
                <button
                  key={`surgery-month-${month}`}
                  className={`month-pill${casesMonth === month ? ' active' : ''}`}
                  onClick={() => handleCasesMonthChange(month)}
                >
                  {month.replace('-', '.')}
                </button>
              ))}
            </div>
          </div>
          <div className="surgery-summary-wrap">
          <table className="surgery-summary-table">
            <thead>
              <tr>
                <th>Professor</th>
                <th>Ge</th>
                <th>Lo</th>
                <th>Etc.</th>
                <th>{'\uC785\uC6D0'}</th>
                <th>{'\uD1F4\uC6D0'}</th>
              </tr>
            </thead>
            <tbody>
              {selectedMonthProfessors.map((p) => (
                <tr key={p.professor_name}>
                  <td>
                    <button className="professor-link-btn" onClick={() => showCases(p.professor_name)}>
                      {p.professor_name}
                    </button>
                  </td>
                  <td>{p.total_general || 0}</td>
                  <td>{p.total_local || 0}</td>
                  <td>{
                    (Number(p.total_mac) || 0) +
                    (Number(p.total_bpb) || 0) +
                    (Number(p.total_snb) || 0) +
                    (Number(p.total_fnb) || 0) +
                    (Number(p.total_spinal) || 0)
                  }</td>
                  <td>{p.total_admission || 0}</td>
                  <td>{p.total_discharge || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>
      </div>

      <section className="card metrics-viewer-card" style={{ marginBottom: '1rem' }}>
        <div className="metrics-layout">
          <aside className="metrics-nav" aria-label="지표 선택">
            <button
              type="button"
              className={`metrics-nav-btn${metricView === 'discharge' ? ' active' : ''}`}
              onClick={() => setMetricView('discharge')}
              aria-pressed={metricView === 'discharge'}
            >
              {'퇴원환자 수'}
            </button>
            <button
              type="button"
              className={`metrics-nav-btn${metricView === 'outpatient' ? ' active' : ''}`}
              onClick={() => setMetricView('outpatient')}
              aria-pressed={metricView === 'outpatient'}
            >
              {'외래 환자 수'}
            </button>
            <button
              type="button"
              className={`metrics-nav-btn${metricView === 'er' ? ' active' : ''}`}
              onClick={() => setMetricView('er')}
              aria-pressed={metricView === 'er'}
            >
              {'ER Suture'}
            </button>
          </aside>

          <div className="metrics-content">
            <div className="metrics-mobile-tabs" role="tablist" aria-label="모바일 지표 탭">
              <button
                type="button"
                className={`metrics-mobile-tab${metricView === 'discharge' ? ' active' : ''}`}
                onClick={() => setMetricView('discharge')}
                aria-pressed={metricView === 'discharge'}
              >
                {'퇴원'}
              </button>
              <button
                type="button"
                className={`metrics-mobile-tab${metricView === 'outpatient' ? ' active' : ''}`}
                onClick={() => setMetricView('outpatient')}
                aria-pressed={metricView === 'outpatient'}
              >
                {'외래'}
              </button>
              <button
                type="button"
                className={`metrics-mobile-tab${metricView === 'er' ? ' active' : ''}`}
                onClick={() => setMetricView('er')}
                aria-pressed={metricView === 'er'}
              >
                {'ER'}
              </button>
            </div>

            <div className="surgery-card-header">
              <h2>
                {metricView === 'discharge'
                  ? DISCHARGE_FIXED_TITLE
                  : metricView === 'outpatient'
                    ? OUTPATIENT_FIXED_TITLE
                    : ER_SUTURE_MONTHLY_TITLE}
              </h2>
              <button className="btn btn-subtle score-check-btn" onClick={() => openMetricScoreModal(metricView)}>
                {metricView === 'discharge'
                  ? DISCHARGE_SCORE_BUTTON_LABEL
                  : metricView === 'outpatient'
                    ? OUTPATIENT_SCORE_BUTTON_LABEL
                    : ER_SCORE_BUTTON_LABEL}
              </button>
            </div>

            {metricView === 'discharge' && (
              <div className="discharge-fixed-table-wrap">
                <table className="discharge-fixed-table">
                  <thead>
                    <tr>
                      {dischargeHeaders.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dischargeRows.map((row) => (
                      <tr key={row.professor}>
                        <td>{row.professor}</td>
                        {row.months.map((value, idx) => (
                          <td key={`${row.professor}-${idx}`}>{value}</td>
                        ))}
                        <td className="discharge-fixed-col-total">{row.total}</td>
                      </tr>
                    ))}
                    <tr className="discharge-fixed-row-total">
                      <td>{MONTH_TOTAL_LABEL}</td>
                      {dischargeMonthTotals.map((value, idx) => (
                        <td key={`month-total-${idx}`}>{value}</td>
                      ))}
                      <td className="discharge-fixed-grand-total">{dischargeGrandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {metricView === 'outpatient' && (
              <div className="outpatient-fixed-table-wrap">
                <table className="outpatient-fixed-table">
                  <thead>
                    <tr>
                      {outpatientHeaders.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {outpatientRows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        {row.months.map((value, idx) => (
                          <td key={`${row.label}-${idx}`}>{value}</td>
                        ))}
                        <td className="outpatient-fixed-col-total">{row.total}</td>
                      </tr>
                    ))}
                    <tr className="outpatient-fixed-row-total">
                      <td>{MONTH_TOTAL_LABEL}</td>
                      {outpatientMonthTotals.map((value, idx) => (
                        <td key={`outpatient-month-total-${idx}`}>{value}</td>
                      ))}
                      <td className="outpatient-fixed-grand-total">{outpatientGrandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {metricView === 'er' && (
              <div className="er-suture-monthly-wrap">
                <table className="er-suture-monthly-table">
                  <thead>
                    <tr>
                      <th>{CLASS_LABEL}</th>
                      {selectedMonthKeys.map((monthKey) => (
                        <th key={`ers-header-${monthKey}`}>{formatMonthLabel(monthKey, true)}</th>
                      ))}
                      <th>{TOTAL_LABEL}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>ER Suture</td>
                      {erSutureMonthlyValues.map((value, idx) => (
                        <td key={`ers-value-${selectedMonthKeys[idx]}`}>{value}</td>
                      ))}
                      <td className="er-suture-total-cell">{erSutureMonthlyTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {fileLogModalOpen && (
        <div className="modal-overlay" onClick={() => setFileLogModalOpen(false)}>
          <div className="modal-content upload-log-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{FILE_LOG_TITLE}</h3>
              <button className="modal-close-btn" onClick={() => setFileLogModalOpen(false)}>
                {'\uB2EB\uAE30'}
              </button>
            </div>
            <p className="score-modal-note">
              {`전체 ${fileLogState.total}건 / 페이지 ${fileLogPage} / ${fileLogState.totalPages}`}
            </p>
            {fileLogState.loading && <p className="score-modal-note">{'\uBD88\uB7EC\uC624\uB294 \uC911...'}</p>}
            {!!fileLogState.error && <p className="score-modal-note">{fileLogState.error}</p>}
            {!fileLogState.loading && !fileLogState.error && (
              <>
                <div className="upload-log-modal-table-wrap">
                  <table className="upload-log-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>{'\uC218\uC220'}</th>
                        <th>{'\uC785\uC6D0'}</th>
                        <th>{'\uD1F4\uC6D0'}</th>
                        <th>{'\uC751\uAE09\uC2E4'}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileLogState.items.length === 0 && (
                        <tr>
                          <td colSpan={6}>{'\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'}</td>
                        </tr>
                      )}
                      {fileLogState.items.map((log) => (
                        <tr key={log.date}>
                          <td>{log.date}</td>
                          <td>{log.total_surgery_count || 0}</td>
                          <td>{log.admission_count || 0}</td>
                          <td>{log.discharge_count || 0}</td>
                          <td>{log.er_first_count || 0}</td>
                          <td>
                            <button className="btn btn-danger" onClick={() => handleDeleteLog(log.date)}>
                              {'\uC0AD\uC81C'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="upload-log-pagination">
                  <button
                    type="button"
                    className="btn btn-subtle"
                    disabled={fileLogPage <= 1 || fileLogState.loading}
                    onClick={() => setFileLogPage((prev) => Math.max(1, prev - 1))}
                  >
                    {'\uC774\uC804'}
                  </button>
                  <span>{`${fileLogPage} / ${fileLogState.totalPages}`}</span>
                  <button
                    type="button"
                    className="btn btn-subtle"
                    disabled={fileLogPage >= fileLogState.totalPages || fileLogState.loading}
                    onClick={() => setFileLogPage((prev) => Math.min(fileLogState.totalPages, prev + 1))}
                  >
                    {'\uB2E4\uC74C'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {detailModal.show && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal-content detail-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{detailModal.professor} Cases</h3>
              <button className="modal-close-btn" onClick={closeDetailModal}>
                {'\uB2EB\uAE30'}
              </button>
            </div>
            <details className="detail-classification-guide">
              <summary>분류 코드 보기</summary>
              <div className="detail-classification-guide-list">
                {DIAGNOSIS_CODE_OPTIONS.map((item) => (
                  <span key={`guide-${item.code}`}>{item.label}</span>
                ))}
              </div>
            </details>
            <table className="detail-cases-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{'\uD658\uC790'}</th>
                  <th>{'\uC218\uC220\uBA85'}</th>
                  <th>{'\uB9C8\uCDE8'}</th>
                  <th>{'\uBD84\uB958'}</th>
                </tr>
              </thead>
              <tbody>
                {detailModal.cases.map((c, idx) => {
                  const rowKey = caseRowKey(c)
                  const isRowSelected = !!c.case_checked
                  const isRowCheckSaving = !!savingCaseChecks[rowKey]
                  const effectiveCounts = getEffectiveCaseCodeCounts(c)
                  const displayedDiagnosis = getDisplayedDiagnosisText(c, effectiveCounts)
                  return (
                    <tr key={`${rowKey}-${idx}`} className={isRowSelected ? 'detail-row-selected' : ''}>
                      <td className="detail-date-cell">{c.date}</td>
                      <td>
                        <div className="detail-patient-cell">
                          <button
                            type="button"
                            className={`detail-row-check-btn${isRowSelected ? ' active' : ''}`}
                            onClick={() => toggleCaseRowSelected(c)}
                            aria-pressed={isRowSelected}
                            aria-label={`행 선택 ${c.patient_name}`}
                            title="행 선택"
                            disabled={isRowCheckSaving}
                          >
                            <span aria-hidden="true">{isRowCheckSaving ? '…' : '✓'}</span>
                          </button>
                          <span>{c.patient_name}</span>
                        </div>
                      </td>
                      <td className="detail-case-cell">
                        {formatCaseName(c.case_name)}
                        <span className="detail-mobile-meta">{`${c.anesthesia || '-'} / ${displayedDiagnosis}`}</span>
                      </td>
                      <td>{c.anesthesia}</td>
                      <td>
                        <div className="case-classification-cell">
                          <span className="case-classification-text">
                            {displayedDiagnosis}
                          </span>
                          {editingCaseKey !== rowKey ? (
                            <button
                              type="button"
                              className="btn btn-subtle case-classification-edit-btn"
                              onClick={() => startCaseClassificationEdit(c)}
                            >
                              수정
                            </button>
                          ) : (
                            <div className="case-classification-editor">
                              <div className="case-classification-option-list">
                                {DIAGNOSIS_CODE_OPTIONS.map(({ code, label }) => (
                                  <div
                                    key={`${rowKey}-${code}`}
                                    className={`case-classification-option${(editingCaseCodeCounts[code] || 0) > 0 ? ' active' : ''}`}
                                  >
                                    <button
                                      type="button"
                                      className="case-count-btn"
                                      onClick={() => adjustEditingDiagnosisCodeCount(code, -1)}
                                    >
                                      -
                                    </button>
                                    <button
                                      type="button"
                                      className="case-classification-option-label"
                                      onClick={() => adjustEditingDiagnosisCodeCount(code, (editingCaseCodeCounts[code] || 0) > 0 ? -1 : 1)}
                                    >
                                      {label}
                                    </button>
                                    <button
                                      type="button"
                                      className="case-count-btn"
                                      onClick={() => adjustEditingDiagnosisCodeCount(code, 1)}
                                    >
                                      +
                                    </button>
                                    <span className="case-count-value">{editingCaseCodeCounts[code] || 0}</span>
                                  </div>
                                ))}
                              </div>
                              <p className="case-classification-help">같은 분류를 2개 넣으려면 해당 분류의 + 버튼을 두 번 누르세요.</p>
                              {!!detailEditError && <p className="case-classification-error">{detailEditError}</p>}
                              <div className="case-classification-actions">
                                <button
                                  type="button"
                                  className="btn btn-subtle"
                                  onClick={cancelCaseClassificationEdit}
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  className="btn case-sync-btn"
                                  onClick={() => saveCaseClassifications(c)}
                                  aria-label="분류 임시 저장"
                                  title="분류 임시 저장"
                                >
                                  ⟳
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {categoryModalOpen && (
        <div className="modal-overlay" onClick={() => setCategoryModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{categoryModalTitle}</h3>
              <button className="modal-close-btn" onClick={() => setCategoryModalOpen(false)}>
                {'\uB2EB\uAE30'}
              </button>
            </div>
            <p className="score-modal-note">
              {`기준 기간: ${rangeLabel} (${scoreMonthsCount}개월) / 기간합계 ${scorePeriodSum.toFixed(0)}명 / 연환산: ${scorePeriodSum.toFixed(0)} × ${annualizeFactor.toFixed(2)} = ${annualizedOutpatient.toFixed(2)} / 환산 기준 계수: ${thresholdMultiplier.toFixed(1)} / 점수 ${matchedScore}점`}
            </p>
            {showNextStepHint && (
              <p className="score-modal-note">
                {'\u0031\uB144 \uAE30\uC900 \uD3C9\uAC00\uC774\uBBC0\uB85C \uB2E4\uC74C 1\uAC1C\uC6D4 \uCD94\uAC00 \uC2DC \uAC1C\uC6D4\uC218(N+1) \uAE30\uC900\uC73C\uB85C \uACC4\uC0B0\uB429\uB2C8\uB2E4.'}
              </p>
            )}
            {showNextStepHint && !hasHigherScoreRows && (
              <p className="score-modal-note">{'\uC774\uBBF8 \uCD5C\uACE0 \uB2E8\uACC4 \uC810\uC218\uC785\uB2C8\uB2E4.'}</p>
            )}
            <div className="score-input-head">
              <h4>{'\uAE30\uC900\uAE30\uAC04 \uC22B\uC790 (\uC218\uB3D9 \uC218\uC815 \uAC00\uB2A5)'}</h4>
              <div className="score-input-actions">
                <button className="btn btn-subtle score-reset-btn" onClick={resetScoreInputs}>
                  {'\uAE30\uBCF8\uAC12 \uBCF5\uC6D0'}
                </button>
                <button
                  className="btn btn-subtle score-sync-btn"
                  onClick={handleSyncCategoryScoreInputs}
                  disabled={!hasPendingCategoryScoreSync}
                >
                  Sync
                </button>
              </div>
            </div>
            <div className="score-table-scroll">
              <table className="score-input-table">
                <thead>
                  <tr>
                    <th>{'\uAD6C\uBD84'}</th>
                    {editableMonthlyRows.map((row) => (
                      <th key={`score-head-${row.month}`}>{row.month.replace('-', '.')}</th>
                    ))}
                    <th>{'\uD569\uACC4'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{scoreSourceLabel}</td>
                    {editableMonthlyRows.map((row) => (
                      <td key={`score-input-${row.month}`}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.value}
                          onChange={(e) => updateScoreInput(row.month, e.target.value)}
                          className="score-month-input"
                        />
                      </td>
                    ))}
                    <td>{scorePeriodSum.toFixed(0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="score-table-scroll">
              <table className="score-criteria-table">
                <thead>
                  <tr>
                    <th>{'\uAE30\uC900'}</th>
                    <th>{'\uD658\uC0B0 n \uC218'}</th>
                    <th>{'\uC810\uC218'}</th>
                    {showNextStepHint && <th>{'\u0031\uB2EC \uD544\uC694 \uC218'}</th>}
                  </tr>
                </thead>
                <tbody>
                  {scoreRows.map((row) => (
                    <tr key={`score-row-${row.id}`} className={row.isMatched ? 'score-row-active' : ''}>
                      <td>{`${row.isMatched ? '\u25A0' : '\u2610'} ${row.label}`}</td>
                      <td>{formatConvertedRange(row)}</td>
                      <td>{`${row.score}\uC810`}</td>
                      {showNextStepHint && (
                        <td>
                          {Object.prototype.hasOwnProperty.call(neededOneMonthByRowId, row.id)
                            ? `${neededOneMonthByRowId[row.id]}\uBA85`
                            : '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {erScoreModalOpen && (
        <div className="modal-overlay" onClick={() => setErScoreModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{ER_SCORE_MODAL_TITLE}</h3>
              <button className="modal-close-btn" onClick={() => setErScoreModalOpen(false)}>
                {'\uB2EB\uAE30'}
              </button>
            </div>
            <p className="score-modal-note">
              {'\uC2EC\uC0AC \uAE30\uC900\uC740 1\uB144 \uAE30\uC900\uC774\uBBC0\uB85C \uC120\uD0DD \uAE30\uAC04\uC774 6\uAC1C\uC6D4\uC774\uBA74 \u00D72.00(=12/6) \uC5F0\uD658\uC0B0 \uACC4\uC218\uAC00 \uC801\uC6A9\uB429\uB2C8\uB2E4.'}
            </p>
            <div className="score-input-head">
              <h4>{'\uAE30\uC900\uAE30\uAC04 \uC22B\uC790 (\uC218\uB3D9 \uC218\uC815 \uAC00\uB2A5)'}</h4>
              <div className="score-input-actions">
                <button className="btn btn-subtle score-reset-btn" onClick={resetErScoreInputs}>
                  {'\uAE30\uBCF8\uAC12 \uBCF5\uC6D0'}
                </button>
                <button
                  className="btn btn-subtle score-sync-btn"
                  onClick={handleSyncErScoreInputs}
                  disabled={!hasPendingErScoreSync}
                >
                  Sync
                </button>
              </div>
            </div>
            <div className="score-table-scroll">
              <table className="score-input-table">
                <thead>
                  <tr>
                    <th>{'\uAD6C\uBD84'}</th>
                    {erEditableMonthlyRows.map((row) => (
                      <th key={`er-score-head-${row.month}`}>{row.month.replace('-', '.')}</th>
                    ))}
                    <th>{'\uD569\uACC4'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>ER Suture</td>
                    {erEditableMonthlyRows.map((row) => (
                      <td key={`er-score-input-${row.month}`}>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.value}
                          onChange={(e) => updateErScoreInput(row.month, e.target.value)}
                          className="score-month-input"
                        />
                      </td>
                    ))}
                    <td>{erScorePeriodSum.toFixed(0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="score-modal-note">
              {residentTotal > 0
                ? `${erScorePeriodSum.toFixed(0)} \u00D7 ${annualizeFactor.toFixed(2)} \u00F7 ${residentTotal} = ${erPerResident.toFixed(1)} / \uC810\uC218 ${erMatchedScore}\uC810`
                : '\uCD1D \uC804\uACF5\uC758\uC218\uAC00 0\uC774\uBA74 \uACC4\uC0B0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'}
            </p>
            <div className="score-table-scroll">
              <table className="score-criteria-table">
                <thead>
                  <tr>
                    <th>{'\uAE30\uC900'}</th>
                    <th>{'\uAD6C\uAC04'}</th>
                    <th>{'\uC810\uC218'}</th>
                  </tr>
                </thead>
                <tbody>
                  {erScoreRows.map((row) => (
                    <tr key={`er-score-row-${row.id}`} className={row.isMatched ? 'score-row-active' : ''}>
                      <td>{`${row.isMatched ? '\u25A0' : '\u2610'} ${row.label}`}</td>
                      <td>
                        {Number.isFinite(row.max)
                          ? `${row.min}~${row.max}\uAC74`
                          : `${row.min}\uAC74 \uC774\uC0C1`}
                      </td>
                      <td>{`${row.score}\uC810`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {surgeryScoreModalOpen && (
        <div className="modal-overlay" onClick={() => setSurgeryScoreModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{SURGERY_SCORE_MODAL_TITLE}</h3>
              <button className="modal-close-btn" onClick={() => setSurgeryScoreModalOpen(false)}>
                {'\uB2EB\uAE30'}
              </button>
            </div>
            <p className="score-modal-note">
              {`\uD45C\uC2DC \uAE30\uAC04: ${rangeLabel} / \uC5F0\uD658\uC0B0 \uACC4\uC218 ${annualizeFactor.toFixed(2)} / \uCD1D \uAC74\uC218 ${surgeryScoreGrandTotal} / \uCD1D \uC810\uC218 ${surgeryScoreTotal.toFixed(1)}\uC810`}
            </p>
            {surgeryScoreState.loading && <p className="score-modal-note">{'\uBD88\uB7EC\uC624\uB294 \uC911...'}</p>}
            {!!surgeryScoreState.error && <p className="score-modal-note">{surgeryScoreState.error}</p>}
            {!surgeryScoreState.loading && !surgeryScoreState.error && (
              <div className="surgery-score-table-wrap">
                <table className="score-criteria-table surgery-score-table">
                  <thead>
                    <tr>
                      <th>{'\uBD84\uC57C'}</th>
                      {surgeryScoreMonths.map((monthKey) => (
                        <th key={`surgery-score-head-${monthKey}`}>{monthKey.replace('-', '.')}</th>
                      ))}
                      <th>{'\uD569\uACC4'}</th>
                      <th>{'\uAE30\uC900'}</th>
                      <th>{'\uD574\uB2F9 \uC810\uC218'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surgeryScoreRows.map((row) => (
                      <tr key={`surgery-score-row-${row.category_key || row.category_label}`} className={row.is_met ? 'score-row-active' : ''}>
                        <td>{surgeryCategoryLabel(row)}</td>
                        {(row.monthly_counts || []).map((value, idx) => (
                          <td key={`surgery-score-month-${row.category_key || row.category_label}-${idx}`}>{value}</td>
                        ))}
                        <td>{Number(row.raw_sum || 0)}</td>
                        <td className="surgery-score-criteria-cell">{surgeryCriteriaText(row)}</td>
                        <td>
                          <span className={`surgery-score-badge${row.is_met ? ' tier2' : ' tier1'}`}>
                            {`${Number(row.score || 0).toFixed(1)}\uC810`}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="score-row-active">
                      <td>{'\uC6D4\uBCC4 \uD569\uACC4'}</td>
                      {surgeryScoreMonthTotals.map((value, idx) => (
                        <td key={`surgery-score-month-total-${idx}`}>{value}</td>
                      ))}
                      <td>{surgeryScoreGrandTotal}</td>
                      <td>{'\uCD1D \uC810\uC218'}</td>
                      <td>
                        <span className="surgery-score-badge tier2">{`${surgeryScoreTotal.toFixed(1)}\uC810`}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
