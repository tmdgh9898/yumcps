import { useEffect, useMemo, useRef, useState } from 'react'
import api from './api/client'
import './index.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const MONTHS = [
  '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04',
  '2026-05', '2026-06', '2026-07', '2026-08',
]
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
const FILE_LOG_TITLE = '\uD30C\uC77C \uB85C\uADF8 (\uCD5C\uADFC30\uAC1C)'
const CATEGORY_MODAL_TITLE = '\uC2EC\uC0AC \uC810\uC218'
const DISCHARGE_SCORE_BUTTON_LABEL = '\uD559\uD68C\uC2EC\uC0AC \uC810\uC218 \uCDA9\uC871\uC694\uAC74 \uD655\uC778'
const OUTPATIENT_SCORE_BUTTON_LABEL = '\uD559\uD68C\uC2EC\uC0AC \uC810\uC218 \uCDA9\uC871\uC694\uAC74 \uD655\uC778'
const ER_SCORE_BUTTON_LABEL = '\uD559\uD68C\uC2EC\uC0AC \uC810\uC218 \uCDA9\uC871\uC694\uAC74 \uD655\uC778'
const ER_SCORE_MODAL_TITLE = '\uC751\uAE09\uC2E4 \uC810\uC218'
const SURGERY_SCORE_BUTTON_LABEL = '\uD559\uD68C\uC2EC\uC0AC \uC810\uC218 \uCDA9\uC871\uC694\uAC74 \uD655\uC778'
const SURGERY_SCORE_MODAL_TITLE = '\uBD84\uC57C\uBCC4 \uC218\uC220 \uAC74\uC218'
const ENABLE_SCORE_NEXT_STEP_HINT = true
const SCORE_INPUT_STORAGE_KEY = 'yumcps.scoreInputByMonth.v1'
const DISCHARGE_SCORE_INPUT_STORAGE_KEY = 'yumcps.dischargeScoreInputByMonth.v1'
const ER_SCORE_INPUT_STORAGE_KEY = 'yumcps.erScoreInputByMonth.v1'
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

function App() {
  const fileInputRef = useRef(null)
  const [reportsByMonth, setReportsByMonth] = useState({})
  const [recentLogs, setRecentLogs] = useState([])
  const [recentUploadedNames, setRecentUploadedNames] = useState([])
  const [residentByYear, setResidentByYear] = useState({ y1: 2, y2: 2, y3: 1, y4: 1 })
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [detailModal, setDetailModal] = useState({ show: false, professor: '', cases: [] })
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [erScoreModalOpen, setErScoreModalOpen] = useState(false)
  const [surgeryScoreModalOpen, setSurgeryScoreModalOpen] = useState(false)
  const [surgeryScoreState, setSurgeryScoreState] = useState({ loading: false, error: '', data: null })
  const [scoreModalType, setScoreModalType] = useState('discharge')
  const [scoreInputByMonth, setScoreInputByMonth] = useState({})
  const [dischargeScoreInputByMonth, setDischargeScoreInputByMonth] = useState({})
  const [erScoreInputByMonth, setErScoreInputByMonth] = useState({})
  const [rangeStartMonth, setRangeStartMonth] = useState('2025-09')
  const [rangeEndMonth, setRangeEndMonth] = useState('2026-02')
  const [casesMonth, setCasesMonth] = useState('2026-02')

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

  const erSutureMonthlyValues = useMemo(
    () => selectedMonthKeys.map((monthKey) => {
      if (Object.prototype.hasOwnProperty.call(ER_SUTURE_FIXED_BY_MONTH, monthKey)) {
        return ER_SUTURE_FIXED_BY_MONTH[monthKey]
      }
      return Number(reportsByMonth[monthKey]?.outpatient?.total_er_suture) || 0
    }),
    [selectedMonthKeys, reportsByMonth]
  )
  const erSutureMonthlyTotal = useMemo(
    () => erSutureMonthlyValues.reduce((sum, value) => sum + value, 0),
    [erSutureMonthlyValues]
  )

  const recentLogsTop30 = useMemo(() => recentLogs.slice(0, 30), [recentLogs])

  const dischargeHeaders = useMemo(
    () => [DISCHARGE_HEADER_FIRST, ...selectedMonthKeys.map((month) => month.replace('-', '.')), DISCHARGE_HEADER_LAST],
    [selectedMonthKeys]
  )
  const dischargeRows = useMemo(() => {
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
  const dischargeMonthTotals = useMemo(
    () => selectedMonthKeys.map((_, idx) => dischargeRows.reduce((sum, row) => sum + (row.months[idx] || 0), 0)),
    [selectedMonthKeys, dischargeRows]
  )
  const dischargeGrandTotal = useMemo(
    () => dischargeMonthTotals.reduce((sum, value) => sum + value, 0),
    [dischargeMonthTotals]
  )
  const outpatientHeaders = useMemo(
    () => [CLASS_LABEL, ...selectedMonthKeys.map((month) => month.replace('-', '.')), '\uD56D\uBAA9\uBCC4 \uD569\uACC4'],
    [selectedMonthKeys]
  )
  const outpatientRows = useMemo(() => {
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
    () => Object.fromEntries(
      selectedMonthKeys.map((month) => {
        const outpatient = reportsByMonth[month]?.outpatient || EMPTY_OUTPATIENT
        const total = (Number(outpatient.total_first) || 0) + (Number(outpatient.total_re) || 0)
        return [month, total]
      })
    ),
    [selectedMonthKeys, reportsByMonth]
  )
  const dischargeScoreDefaultByMonth = useMemo(
    () => Object.fromEntries(selectedMonthKeys.map((month, idx) => [month, Number(dischargeMonthTotals[idx] || 0)])),
    [selectedMonthKeys, dischargeMonthTotals]
  )
  const activeScoreDefaults = scoreModalType === 'discharge' ? dischargeScoreDefaultByMonth : scoreDefaultByMonth
  const activeScoreInputs = scoreModalType === 'discharge' ? dischargeScoreInputByMonth : scoreInputByMonth
  const editableMonthlyRows = useMemo(
    () => selectedMonthKeys.map((month) => ({
      month,
      defaultValue: Number(activeScoreDefaults[month] || 0),
      value: Number(activeScoreInputs[month] ?? activeScoreDefaults[month] ?? 0),
    })),
    [selectedMonthKeys, activeScoreDefaults, activeScoreInputs]
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
    () => Object.fromEntries(selectedMonthKeys.map((month, idx) => [month, Number(erSutureMonthlyValues[idx] || 0)])),
    [selectedMonthKeys, erSutureMonthlyValues]
  )
  const erEditableMonthlyRows = useMemo(
    () => selectedMonthKeys.map((month) => ({
      month,
      defaultValue: Number(erScoreDefaultByMonth[month] || 0),
      value: Number(erScoreInputByMonth[month] ?? erScoreDefaultByMonth[month] ?? 0),
    })),
    [selectedMonthKeys, erScoreDefaultByMonth, erScoreInputByMonth]
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
  const surgeryScoreAdjustedTotal = useMemo(
    () => Number(surgeryScoreState.data?.totals?.total_adjusted_sum ?? (surgeryScoreGrandTotal * annualizeFactor)),
    [surgeryScoreState.data, surgeryScoreGrandTotal, annualizeFactor]
  )
  const surgeryScoreTotal = useMemo(
    () => surgeryScoreRows.reduce((sum, row) => sum + Number(row.score || 0), 0),
    [surgeryScoreRows]
  )

  async function fetchDashboard() {
    const monthKeys = MONTHS.join(',')
    const res = await api.get(`${API_BASE}/api/dashboard`, { params: { months: monthKeys } })
    setReportsByMonth(res.data.reports || {})
    setRecentLogs(res.data.recentLogs || [])
  }

  useEffect(() => {
    fetchDashboard().catch((err) => setMessage(err.message))
  }, [])

  useEffect(() => {
    if (!surgeryScoreModalOpen) return
    let active = true

    async function fetchSurgeryScore() {
      setSurgeryScoreState((prev) => ({ ...prev, loading: true, error: '' }))
      try {
        const res = await api.get(`${API_BASE}/api/category-score`, {
          params: {
            start_month: rangeStartMonth,
            end_month: rangeEndMonth,
            multiplier: annualizeFactor,
          },
        })
        if (!active) return
        setSurgeryScoreState({ loading: false, error: '', data: res.data })
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
    const hasModalOpen = detailModal.show || categoryModalOpen || erScoreModalOpen || surgeryScoreModalOpen
    if (hasModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = originalOverflow || ''
    }
    return () => {
      document.body.style.overflow = originalOverflow || ''
    }
  }, [detailModal.show, categoryModalOpen, erScoreModalOpen, surgeryScoreModalOpen])

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

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
    } catch (err) {
      setMessage('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
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
    } catch (err) {
      setMessage('Case load failed: ' + err.message)
    }
  }

  async function handleDeleteLog(date) {
    if (!window.confirm(`Delete ${date}?`)) return
    try {
      await api.delete(`${API_BASE}/api/logs/${date}`)
      await fetchDashboard()
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

  function updateScoreInput(monthKey, nextValue) {
    const parsed = Math.max(0, Number(nextValue) || 0)
    if (scoreModalType === 'discharge') {
      setDischargeScoreInputByMonth((prev) => ({ ...prev, [monthKey]: parsed }))
      return
    }
    setScoreInputByMonth((prev) => ({ ...prev, [monthKey]: parsed }))
  }

  function resetScoreInputs() {
    const nextInputs = {}
    selectedMonthKeys.forEach((month) => {
      nextInputs[month] = Number(activeScoreDefaults[month] || 0)
    })
    if (scoreModalType === 'discharge') {
      setDischargeScoreInputByMonth((prev) => ({ ...prev, ...nextInputs }))
      return
    }
    setScoreInputByMonth((prev) => ({ ...prev, ...nextInputs }))
  }

  function updateErScoreInput(monthKey, nextValue) {
    const parsed = Math.max(0, Number(nextValue) || 0)
    setErScoreInputByMonth((prev) => ({ ...prev, [monthKey]: parsed }))
  }

  function resetErScoreInputs() {
    const nextInputs = {}
    selectedMonthKeys.forEach((month) => {
      nextInputs[month] = Number(erScoreDefaultByMonth[month] || 0)
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
    const parsed = Math.max(0, Number(value) || 0)
    setResidentByYear((prev) => ({ ...prev, [key]: parsed }))
  }

  function formatCaseName(caseName) {
    const text = String(caseName || '')
    return text.replace(/\s+(\d+\.)/g, '\n$1').trim()
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

  return (
    <div className="container">
      <header>
        <h1>YUMC PS</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{SUBTITLE_TEXT}</p>
          <div className="resident-config" style={{ marginTop: 0 }}>
            <div className="resident-config-inputs">
              <label>{YEAR_LABELS[0]}: (<input type="number" min="0" step="1" value={residentByYear.y1} onChange={(e) => updateResidentByYear('y1', e.target.value)} />)</label>
              <span>/</span>
              <label>{YEAR_LABELS[1]}: (<input type="number" min="0" step="1" value={residentByYear.y2} onChange={(e) => updateResidentByYear('y2', e.target.value)} />)</label>
              <span>/</span>
              <label>{YEAR_LABELS[2]}: (<input type="number" min="0" step="1" value={residentByYear.y3} onChange={(e) => updateResidentByYear('y3', e.target.value)} />)</label>
              <span>/</span>
              <label>{YEAR_LABELS[3]}: (<input type="number" min="0" step="1" value={residentByYear.y4} onChange={(e) => updateResidentByYear('y4', e.target.value)} />)</label>
            </div>
            <div className="resident-config-summary">
              {SCORE_PREFIX} {residentTotal} / {YEAR_COUNT_LABEL} {residentYearCount}{residentYearCount > 0 ? ` = ${convertedScore.toFixed(2)}` : ''}
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

      <div className="top-half-row">
        <section className="card half-card" style={{ marginBottom: '1rem' }}>
          <div className="surgery-card-header">
            <h2>{'\uC218\uC220 \uC6D4\uBCC4 \uC694\uC57D \uBC0F \uC0C1\uC138'} ({casesMonth.replace('-', '.')})</h2>
            <button className="btn btn-subtle score-check-btn" onClick={() => setSurgeryScoreModalOpen(true)}>
              {SURGERY_SCORE_BUTTON_LABEL}
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '0.65rem' }}>
            {'* \uAD50\uC218\uB2D8 \uC131\uD568 \uD074\uB9AD \uC2DC \uC0C1\uC138 \uD655\uC778 \uAC00\uB2A5'}
          </p>
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

        <section className="card" style={{ marginBottom: '1rem' }}>
          <h2>{'\uB2F9\uC9C1\uC77C\uC9C0 \uC5C5\uB85C\uB4DC'}</h2>
          <div className="upload-banner">
            <div className="upload-dropzone" onClick={openFilePicker}>
              <div className="upload-dropzone-title">XLSX Upload</div>
              <p className="upload-dropzone-note">Click to select one or more daily log files.</p>
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

            <div className="upload-log-panel">
              <div className="upload-log-head">
                <h3>{FILE_LOG_TITLE}</h3>
              </div>
              <table className="upload-log-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>{'\uC218\uC220'}</th>
                    <th>{'\uC785\uC6D0'}</th>
                    <th>{'\uD1F4\uC6D0+\uC804\uCD9C'}</th>
                    <th>{'\uC751\uAE09\uC2E4'}</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogsTop30.map((log) => (
                    <tr key={log.date}>
                      <td>{log.date}</td>
                      <td>{log.total_surgery_count || 0}</td>
                      <td>{log.admission_count || 0}</td>
                      <td>{log.discharge_count || 0}</td>
                      <td>{log.er_first_count || 0}</td>
                      <td><button className="btn" onClick={() => handleDeleteLog(log.date)}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <div className="surgery-card-header">
          <h2>{DISCHARGE_FIXED_TITLE}</h2>
          <button className="btn btn-subtle score-check-btn" onClick={() => openCategoryScore('discharge')}>
            {DISCHARGE_SCORE_BUTTON_LABEL}
          </button>
        </div>
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
      </section>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <div className="surgery-card-header">
          <h2>{OUTPATIENT_FIXED_TITLE}</h2>
          <button className="btn btn-subtle score-check-btn" onClick={() => openCategoryScore('outpatient')}>
            {OUTPATIENT_SCORE_BUTTON_LABEL}
          </button>
        </div>
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
      </section>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <div className="surgery-card-header">
          <h2>{ER_SUTURE_MONTHLY_TITLE}</h2>
          <button className="btn btn-subtle score-check-btn" onClick={() => setErScoreModalOpen(true)}>
            {ER_SCORE_BUTTON_LABEL}
          </button>
        </div>
        <div className="er-suture-monthly-wrap">
          <table className="er-suture-monthly-table">
            <thead>
              <tr>
                <th>{CLASS_LABEL}</th>
                {selectedMonthKeys.map((monthKey) => (
                  <th key={`ers-header-${monthKey}`}>{monthKey.replace('-', '.')}</th>
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
      </section>

      {detailModal.show && (
        <div className="modal-overlay" onClick={() => setDetailModal({ show: false, professor: '', cases: [] })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{detailModal.professor} Cases</h3>
              <button className="modal-close-btn" onClick={() => setDetailModal({ show: false, professor: '', cases: [] })}>
                {'\uB2EB\uAE30'}
              </button>
            </div>
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
                {detailModal.cases.map((c, idx) => (
                  <tr key={`${c.date}-${idx}`}>
                    <td className="detail-date-cell">{c.date}</td>
                    <td>{c.patient_name}</td>
                    <td className="detail-case-cell">{formatCaseName(c.case_name)}</td>
                    <td>{c.anesthesia}</td>
                    <td>{diagnosisLabel(c.diagnosis_code)}</td>
                  </tr>
                ))}
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
              <button className="btn btn-subtle score-reset-btn" onClick={resetScoreInputs}>
                {'\uAE30\uBCF8\uAC12 \uBCF5\uC6D0'}
              </button>
            </div>
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
              <button className="btn btn-subtle score-reset-btn" onClick={resetErScoreInputs}>
                {'\uAE30\uBCF8\uAC12 \uBCF5\uC6D0'}
              </button>
            </div>
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
            <p className="score-modal-note">
              {residentTotal > 0
                ? `${erScorePeriodSum.toFixed(0)} \u00D7 ${annualizeFactor.toFixed(2)} \u00F7 ${residentTotal} = ${erPerResident.toFixed(1)} / \uC810\uC218 ${erMatchedScore}\uC810`
                : '\uCD1D \uC804\uACF5\uC758\uC218\uAC00 0\uC774\uBA74 \uACC4\uC0B0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'}
            </p>
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
              {`\uD45C\uC2DC \uAE30\uAC04: ${rangeLabel} / \uC5F0\uD658\uC0B0 \uACC4\uC218 ${annualizeFactor.toFixed(2)} / \uCD1D \uAC74\uC218 ${surgeryScoreGrandTotal} / \uC5F0\uD658\uC0B0 \uAC74\uC218 ${surgeryScoreAdjustedTotal.toFixed(1)} / \uCD1D \uC810\uC218 ${surgeryScoreTotal.toFixed(1)}\uC810`}
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
                          <td key={`surgery-score-month-${row.category_key}-${idx}`}>{value}</td>
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
