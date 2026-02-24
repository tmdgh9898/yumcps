import { useState, useEffect } from 'react'
import axios from 'axios'
import './index.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

function App() {
    const DISCHARGE_SCORE_BANDS = [
        { key: 'b1', rawLabel: '??300筌?沃섎챶彛?, score: 0 },
        { key: 'b2', rawLabel: '??300 ~ 350筌?, score: 2 },
        { key: 'b3', rawLabel: '??351 ~ 400筌?, score: 4 },
        { key: 'b4', rawLabel: '??401 ~ 450筌?, score: 6 },
        { key: 'b5', rawLabel: '??451筌???곴맒', score: 8 },
    ]
    const OUTPATIENT_SCORE_BANDS = [
        { key: 'o1', rawLabel: '??2500筌?沃섎챶彛?, min: 0, max: 2499, score: 0 },
        { key: 'o2', rawLabel: '??2500~3500筌?, min: 2500, max: 3500, score: 2 },
        { key: 'o3', rawLabel: '??3501~4500筌?, min: 3501, max: 4500, score: 4 },
        { key: 'o4', rawLabel: '??4501~5500筌?, min: 4501, max: 5500, score: 6 },
        { key: 'o5', rawLabel: '??5501~6500筌?, min: 5501, max: 6500, score: 7 },
        { key: 'o6', rawLabel: '??6501筌???곴맒', min: 6501, max: Infinity, score: 8 },
    ]
    const [allMonthsData, setAllMonthsData] = useState([])
    const [selectedMonth, setSelectedMonth] = useState('2026-02')
    const emptyMonthlyDetail = { professors: [], outpatient: { total_first: 0, total_re: 0, total_er_first: 0, total_er_suture: 0 } }
    const [monthlyDetail, setMonthlyDetail] = useState(emptyMonthlyDetail)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState('')
    const [detailModal, setDetailModal] = useState({ show: false, professor: '', cases: [] })
    const [recentLogs, setRecentLogs] = useState([])
    const [reportsByMonth, setReportsByMonth] = useState({})
    const [categoryModalOpen, setCategoryModalOpen] = useState(false)
    const [categoryStartMonth, setCategoryStartMonth] = useState('2025-09')
    const [categoryEndMonth, setCategoryEndMonth] = useState('2026-02')
    const [categoryMultiplier, setCategoryMultiplier] = useState(2)
    const [categoryScoreLoading, setCategoryScoreLoading] = useState(false)
    const [categoryScoreError, setCategoryScoreError] = useState('')
    const [categoryScoreData, setCategoryScoreData] = useState({ months: [], multiplier: 2, rows: [], warnings: [], totals: { monthly_raw_totals: [], total_raw_sum: 0, total_adjusted_sum: 0, met_count: 0, unmet_count: 0 } })
    const [dischargeScoreModalOpen, setDischargeScoreModalOpen] = useState(false)
    const [dischargeStartMonth, setDischargeStartMonth] = useState('2025-09')
    const [dischargeEndMonth, setDischargeEndMonth] = useState('2026-02')
    const [dischargeManualMonthly, setDischargeManualMonthly] = useState({})
    const [residentByYear, setResidentByYear] = useState({ y1: 2, y2: 2, y3: 1, y4: 1 })
    const [dischargePeriodMultiplier, setDischargePeriodMultiplier] = useState(2)
    const [outpatientScoreModalOpen, setOutpatientScoreModalOpen] = useState(false)
    const [outpatientStartMonth, setOutpatientStartMonth] = useState('2025-09')
    const [outpatientEndMonth, setOutpatientEndMonth] = useState('2026-02')
    const [outpatientPeriodMultiplier, setOutpatientPeriodMultiplier] = useState(2)
    const [outpatientManualMonthly, setOutpatientManualMonthly] = useState({})

    const monthsToDisplay = [
        { label: '2025.09', key: '2025-09' },
        { label: '2025.10', key: '2025-10' },
        { label: '2025.11', key: '2025-11' },
        { label: '2025.12', key: '2025-12' },
        { label: '2026.01', key: '2026-01' },
        { label: '2026.02', key: '2026-02' },
        { label: '2026.03', key: '2026-03' },
        { label: '2026.04', key: '2026-04' },
        { label: '2026.05', key: '2026-05' },
        { label: '2026.06', key: '2026-06' },
        { label: '2026.07', key: '2026-07' },
        { label: '2026.08', key: '2026-08' },
    ]

    useEffect(() => {
        fetchAllMonthsData()
    }, [])

    useEffect(() => {
        setMonthlyDetail(reportsByMonth[selectedMonth] || emptyMonthlyDetail)
    }, [selectedMonth, reportsByMonth])

    useEffect(() => {
        setCategoryEndMonth(selectedMonth)
        setDischargeEndMonth(selectedMonth)
        setOutpatientEndMonth(selectedMonth)
    }, [selectedMonth])

    useEffect(() => {
        if (!dischargeScoreModalOpen) return
        const months = getMonthRange(dischargeStartMonth, dischargeEndMonth)
        const autoMultiplier = months.length > 0 ? 12 / months.length : 1
        setDischargePeriodMultiplier(autoMultiplier)
    }, [dischargeScoreModalOpen, dischargeStartMonth, dischargeEndMonth])

    useEffect(() => {
        const months = getMonthRange(outpatientStartMonth, outpatientEndMonth)
        const autoMultiplier = months.length > 0 ? 12 / months.length : 1
        setOutpatientPeriodMultiplier(autoMultiplier)
    }, [outpatientStartMonth, outpatientEndMonth])

    const fetchAllMonthsData = async () => {
        try {
            const monthKeys = monthsToDisplay.map(m => m.key).join(',')
            const res = await axios.get(`${API_BASE}/api/dashboard`, { params: { months: monthKeys } })
            const reports = res.data.reports || {}
            const getReport = (monthKey) => reports[monthKey] || emptyMonthlyDetail

            const professorSourceMonth = monthsToDisplay.find(m => (getReport(m.key).professors || []).length > 0)
            const professors = (professorSourceMonth ? getReport(professorSourceMonth.key).professors : []).map(p => p.professor_name)
            const trend = professors.map(name => {
                const counts = monthsToDisplay.map((m) => {
                    const prof = getReport(m.key).professors.find(p => p.professor_name === name)
                    return prof ? prof.total_discharge : 0
                })
                return { name, counts, total: counts.reduce((a, b) => a + b, 0) }
            })

            const firstVisitTrend = monthsToDisplay.map((m) => getReport(m.key).outpatient.total_first || 0)
            const reVisitTrend = monthsToDisplay.map((m) => getReport(m.key).outpatient.total_re || 0)
            const erFirstTrend = monthsToDisplay.map((m) => getReport(m.key).outpatient.total_er_first || 0)
            const erSutureTrend = monthsToDisplay.map((m) => getReport(m.key).outpatient.total_er_suture || 0)

            setAllMonthsData({ trend, firstVisitTrend, reVisitTrend, erFirstTrend, erSutureTrend })
            setReportsByMonth(reports)
            setRecentLogs(res.data.recentLogs || [])
        } catch (err) {
            console.error(err)
            try {
                const results = await Promise.all(
                    monthsToDisplay.map(m => axios.get(`${API_BASE}/api/report/${m.key}`))
                )
                const reports = {}
                monthsToDisplay.forEach((m, idx) => {
                    reports[m.key] = results[idx].data
                })
                const getReport = (monthKey) => reports[monthKey] || emptyMonthlyDetail

                const professorSourceMonth = monthsToDisplay.find(m => (getReport(m.key).professors || []).length > 0)
                const professors = (professorSourceMonth ? getReport(professorSourceMonth.key).professors : []).map(p => p.professor_name)
                const trend = professors.map(name => {
                    const counts = monthsToDisplay.map((m) => {
                        const prof = getReport(m.key).professors.find(p => p.professor_name === name)
                        return prof ? prof.total_discharge : 0
                    })
                    return { name, counts, total: counts.reduce((a, b) => a + b, 0) }
                })

                const firstVisitTrend = monthsToDisplay.map((m) => getReport(m.key).outpatient.total_first || 0)
                const reVisitTrend = monthsToDisplay.map((m) => getReport(m.key).outpatient.total_re || 0)
                const erFirstTrend = monthsToDisplay.map((m) => getReport(m.key).outpatient.total_er_first || 0)
                const erSutureTrend = monthsToDisplay.map((m) => getReport(m.key).outpatient.total_er_suture || 0)
                const logsRes = await axios.get(`${API_BASE}/api/stats`)

                setAllMonthsData({ trend, firstVisitTrend, reVisitTrend, erFirstTrend, erSutureTrend })
                setReportsByMonth(reports)
                setRecentLogs(logsRes.data || [])
            } catch (legacyErr) {
                console.error(legacyErr)
            }
        }
    }

    const fetchCategoryScore = async (startMonth = categoryStartMonth, endMonth = categoryEndMonth, multiplier = categoryMultiplier) => {
        setCategoryScoreLoading(true)
        setCategoryScoreError('')
        try {
            const res = await axios.get(`${API_BASE}/api/category-score`, {
                params: { start_month: startMonth, end_month: endMonth, multiplier }
            })
            setCategoryScoreData(res.data)
        } catch (err) {
            setCategoryScoreError(err?.response?.data || err.message || '鈺곌퀬??餓???살첒揶쎛 獄쏆뮇源??됰뮸??덈뼄.')
            setCategoryScoreData({ months: [], multiplier, rows: [], warnings: [], totals: { monthly_raw_totals: [], total_raw_sum: 0, total_adjusted_sum: 0, met_count: 0, unmet_count: 0 } })
        } finally {
            setCategoryScoreLoading(false)
        }
    }

    const openCategoryModal = async () => {
        const selectedMonths = getMonthRange(categoryStartMonth, categoryEndMonth)
        const autoMultiplier = selectedMonths.length > 0 ? 12 / selectedMonths.length : 1
        setCategoryMultiplier(autoMultiplier)
        setCategoryModalOpen(true)
        await fetchCategoryScore(categoryStartMonth, categoryEndMonth, autoMultiplier)
    }

    const formatThresholdText = (threshold) => {
        if (!threshold) return '-'
        return `??${threshold.min_for_01}~${threshold.max_for_01}椰?(${threshold.point_01}?? / ??${threshold.min_for_02}椰???곴맒 (${threshold.point_02}??`
    }
    const formatScaledNumber = (value) => {
        if (value === null || value === undefined) return '-'
        return Number(value).toFixed(1).replace(/\.0$/, '')
    }
    const formatCountNumber = (value) => {
        if (value === null || value === undefined) return '-'
        return Number(value).toFixed(1).replace(/\.0$/, '')
    }
    const getMonthRange = (startMonth, endMonth) => {
        const startIdx = monthsToDisplay.findIndex(m => m.key === startMonth)
        const endIdx = monthsToDisplay.findIndex(m => m.key === endMonth)
        if (startIdx < 0 || endIdx < 0 || startIdx > endIdx) return []
        return monthsToDisplay.slice(startIdx, endIdx + 1)
    }
    useEffect(() => {
        if (!categoryModalOpen) return
        const months = getMonthRange(categoryStartMonth, categoryEndMonth)
        const autoMultiplier = months.length > 0 ? 12 / months.length : 1
        setCategoryMultiplier(autoMultiplier)
    }, [categoryModalOpen, categoryStartMonth, categoryEndMonth])
    const getDischargeMonthlyTotal = (monthIndex) => {
        return allMonthsData.trend?.reduce((acc, curr) => acc + (curr.counts?.[monthIndex] || 0), 0) || 0
    }
    const getDischargeDefaultMonthly = (monthKey) => {
        const idx = monthsToDisplay.findIndex(m => m.key === monthKey)
        return getDischargeMonthlyTotal(idx)
    }
    useEffect(() => {
        if (!dischargeScoreModalOpen) return
        const months = getMonthRange(dischargeStartMonth, dischargeEndMonth)
        if (!months.length) {
            setDischargeManualMonthly({})
            return
        }
        const resetByRange = {}
        months.forEach(month => {
            resetByRange[month.key] = getDischargeDefaultMonthly(month.key)
        })
        setDischargeManualMonthly(resetByRange)
    }, [
        dischargeScoreModalOpen,
        dischargeStartMonth,
        dischargeEndMonth,
        allMonthsData.trend
    ])
    const updateDischargeManualValue = (monthKey, value) => {
        const parsed = Math.max(0, Number(value) || 0)
        setDischargeManualMonthly(prev => ({
            ...prev,
            [monthKey]: parsed
        }))
    }
    const getResidentSummary = () => {
        const residentTotal = Object.values(residentByYear).reduce((acc, cur) => acc + (Number(cur) || 0), 0)
        const yearCount = Object.values(residentByYear).filter(v => Number(v) > 0).length
        const residentFactor = yearCount > 0 ? residentTotal / yearCount : 0
        return { residentTotal, yearCount, residentFactor }
    }
    const residentSummary = getResidentSummary()
    const getDischargeScoreResult = () => {
        const rangeMonths = getMonthRange(dischargeStartMonth, dischargeEndMonth)
        const monthlyTotals = rangeMonths.map(month => {
            const manualValue = dischargeManualMonthly[month.key]
            if (manualValue !== undefined) return Math.max(0, Number(manualValue) || 0)
            return getDischargeDefaultMonthly(month.key)
        })
        const rawTotal = monthlyTotals.reduce((acc, cur) => acc + cur, 0)
        const { residentTotal, yearCount, residentFactor } = residentSummary
        const adjustedTotalForScore = rawTotal * dischargePeriodMultiplier
        const cut1 = 450
        const cut2 = 525
        const cut3 = 600
        const cut4 = 675
        const scoreBand = adjustedTotalForScore < cut1
            ? DISCHARGE_SCORE_BANDS[0]
            : adjustedTotalForScore <= cut2
                ? DISCHARGE_SCORE_BANDS[1]
                : adjustedTotalForScore <= cut3
                    ? DISCHARGE_SCORE_BANDS[2]
                    : adjustedTotalForScore <= cut4
                        ? DISCHARGE_SCORE_BANDS[3]
                        : DISCHARGE_SCORE_BANDS[4]
        const adjustedBands = yearCount === 0
            ? [
                { key: 'b1', label: '-' },
                { key: 'b2', label: '-' },
                { key: 'b3', label: '-' },
                { key: 'b4', label: '-' },
                { key: 'b5', label: '-' },
            ]
            : [
                { key: 'b1', label: '< ' + formatCountNumber(300 * residentFactor) + '건' },
                { key: 'b2', label: formatCountNumber(300 * residentFactor) + ' ~ ' + formatCountNumber(350 * residentFactor) + '건' },
                { key: 'b3', label: formatCountNumber(351 * residentFactor) + ' ~ ' + formatCountNumber(400 * residentFactor) + '건' },
                { key: 'b4', label: formatCountNumber(401 * residentFactor) + ' ~ ' + formatCountNumber(450 * residentFactor) + '건' },
                { key: 'b5', label: '>= ' + formatCountNumber(451 * residentFactor) + '건' },
            ]
        return {
            rangeMonths,
            monthlyTotals,
            rawTotal,
            adjustedTotalForScore,
            residentTotal,
            yearCount,
            residentFactor,
            scoreBand,
            adjustedBands,
        }
    }
    const dischargeScoreResult = getDischargeScoreResult()
    const getOutpatientDefaultMonthly = (monthKey) => {
        const idx = monthsToDisplay.findIndex(m => m.key === monthKey)
        return {
            first: allMonthsData.firstVisitTrend?.[idx] || 0,
            re: allMonthsData.reVisitTrend?.[idx] || 0
        }
    }
    useEffect(() => {
        if (!outpatientScoreModalOpen) return
        const months = getMonthRange(outpatientStartMonth, outpatientEndMonth)
        if (!months.length) {
            setOutpatientManualMonthly({})
            return
        }
        const resetByRange = {}
        months.forEach(month => {
            resetByRange[month.key] = getOutpatientDefaultMonthly(month.key)
        })
        setOutpatientManualMonthly(resetByRange)
    }, [
        outpatientScoreModalOpen,
        outpatientStartMonth,
        outpatientEndMonth,
        allMonthsData.firstVisitTrend,
        allMonthsData.reVisitTrend
    ])
    const updateOutpatientManualValue = (monthKey, field, value) => {
        const parsed = Math.max(0, Number(value) || 0)
        setOutpatientManualMonthly(prev => ({
            ...prev,
            [monthKey]: {
                ...(prev[monthKey] || getOutpatientDefaultMonthly(monthKey)),
                [field]: parsed
            }
        }))
    }
    const getOutpatientScoreResult = () => {
        const rangeMonths = getMonthRange(outpatientStartMonth, outpatientEndMonth)
        const monthlyRows = rangeMonths.map(month => {
            const fallback = getOutpatientDefaultMonthly(month.key)
            const manual = outpatientManualMonthly[month.key] || fallback
            const first = Math.max(0, Number(manual.first) || 0)
            const re = Math.max(0, Number(manual.re) || 0)
            return { month: month.key, label: month.label, first, re, total: first + re }
        })
        const totalFirst = monthlyRows.reduce((acc, cur) => acc + cur.first, 0)
        const totalRe = monthlyRows.reduce((acc, cur) => acc + cur.re, 0)
        const rawTotal = totalFirst + totalRe
        const adjustedTotalForScore = rawTotal * outpatientPeriodMultiplier
        const getBandMin = (band) => band.min * residentSummary.residentFactor
        const getBandMax = (band) => Number.isFinite(band.max) ? band.max * residentSummary.residentFactor : Infinity
        const matchedBand = residentSummary.yearCount === 0
            ? OUTPATIENT_SCORE_BANDS[0]
            : (
                OUTPATIENT_SCORE_BANDS.find(band =>
                    adjustedTotalForScore >= getBandMin(band) &&
                    adjustedTotalForScore <= getBandMax(band)
                ) || OUTPATIENT_SCORE_BANDS[0]
            )
        const adjustedBands = residentSummary.yearCount === 0
            ? OUTPATIENT_SCORE_BANDS.map(band => ({ key: band.key, label: '-' }))
            : OUTPATIENT_SCORE_BANDS.map(band => {
                if (!Number.isFinite(band.max)) {
                    return { key: band.key, label: '>= ' + formatCountNumber(band.min * residentSummary.residentFactor) + '건' }
                }
                return {
                    key: band.key,
                    label: formatCountNumber(band.min * residentSummary.residentFactor) + ' ~ ' + formatCountNumber(band.max * residentSummary.residentFactor) + '건'
                }
            })
        return { rangeMonths, monthlyRows, totalFirst, totalRe, rawTotal, adjustedTotalForScore, matchedBand, adjustedBands }
    }
    const outpatientScoreResult = getOutpatientScoreResult()
    const updateResidentByYear = (key, value) => {
        const parsed = Math.max(0, Number(value) || 0)
        setResidentByYear(prev => ({ ...prev, [key]: parsed }))
    }

    const showCases = async (profName) => {
        try {
            const res = await axios.get(`${API_BASE}/api/cases/${selectedMonth}/${profName}`)
            setDetailModal({ show: true, professor: profName, cases: res.data })
        } catch (err) {
            console.error(err)
        }
    }

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        const formData = new FormData()
        files.forEach(file => formData.append('files', file))

        setUploading(true)
        setMessage('')

        try {
            let res
            try {
                res = await axios.post(`${API_BASE}/api/upload-multiple`, formData)
            } catch (multiErr) {
                if (multiErr?.response?.status === 404) {
                    let successCount = 0
                    let failCount = 0
                    for (const file of files) {
                        try {
                            const singleFormData = new FormData()
                            singleFormData.append('file', file)
                            await axios.post(`${API_BASE}/api/upload`, singleFormData)
                            successCount += 1
                        } catch (singleErr) {
                            console.error(`fallback upload failed: ${file.name}`, singleErr)
                            failCount += 1
                        }
                    }
                    res = { data: { successCount, failCount, message: 'fallback upload' } }
                } else {
                    throw multiErr
                }
            }

            const successCount = res?.data?.successCount ?? 0
            const failCount = res?.data?.failCount ?? 0
            if (failCount > 0) setMessage(`??낆쨮???袁⑥┷: ?源껊궗 ${successCount}椰? ??쎈솭 ${failCount}椰?)
            else setMessage(`??낆쨮???袁⑥┷ (${successCount}椰?`)
            await fetchAllMonthsData()
        } catch (err) {
            setMessage('??낆쨮????쎈솭: ' + err.message)
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    const handleDownload = () => {
        window.location.href = `${API_BASE}/api/export/${selectedMonth}`
    }

    const handleDeleteLog = async (date) => {
        if (!confirm(`${date} 일지 데이터를 삭제할까요?`)) return
        try {
            await axios.delete(`${API_BASE}/api/logs/${date}`)
            await fetchAllMonthsData()
        } catch (err) {
            alert('\uC0AD\uC81C \uC2E4\uD328: ' + err.message)
        }
    }

    const visibleMonthIndexes = monthsToDisplay
        .map((_, idx) => idx)
        .filter(idx =>
            (allMonthsData.trend?.some(p => (p.counts?.[idx] || 0) > 0)) ||
            (allMonthsData.firstVisitTrend?.[idx] || 0) > 0 ||
            (allMonthsData.reVisitTrend?.[idx] || 0) > 0 ||
            (allMonthsData.erFirstTrend?.[idx] || 0) > 0 ||
            (allMonthsData.erSutureTrend?.[idx] || 0) > 0
        )
    const visibleMonths = visibleMonthIndexes.map(idx => monthsToDisplay[idx])

    return (
        <div className="container">
            <header>
                <h1>{'YUMC PS'}</h1>
                <p style={{ color: 'var(--text-secondary)' }}>{'\uC6D4\uAC04\uBCF4\uACE0 \uC790\uB3D9\uD654'}</p>
                <div className="resident-config">
                    <div className="resident-config-title">{'\uC5F0\uCC28\uBCC4 \uC804\uACF5\uC758 \uC218'}</div>
                    <div className="resident-config-inputs">
                        <label>{'1\uB144\uCC28'}
                            <input type="number" min="0" step="1" value={residentByYear.y1} onChange={e => updateResidentByYear('y1', e.target.value)} />
                        </label>
                        <label>{'2\uB144\uCC28'}
                            <input type="number" min="0" step="1" value={residentByYear.y2} onChange={e => updateResidentByYear('y2', e.target.value)} />
                        </label>
                        <label>{'3\uB144\uCC28'}
                            <input type="number" min="0" step="1" value={residentByYear.y3} onChange={e => updateResidentByYear('y3', e.target.value)} />
                        </label>
                        <label>{'4\uB144\uCC28'}
                            <input type="number" min="0" step="1" value={residentByYear.y4} onChange={e => updateResidentByYear('y4', e.target.value)} />
                        </label>
                    </div>
                    <div className="resident-config-summary">
                        {'\uCD1D \uC804\uACF5\uC758 '}{residentSummary.residentTotal}{' / \uC5F0\uCC28\uBCC4 \uC804\uACF5\uC758 '}{residentSummary.yearCount}{' = '}{formatScaledNumber(residentSummary.residentFactor)}
                    </div>
                    <div className="resident-config-note">
                        {'1\uB144\uCC28, 2\uB144\uCC28, 3\uB144\uCC28, 4\uB144\uCC28 \uC22B\uC790\uB97C \uBCC0\uACBD\uD574\uC8FC\uC138\uC694.'}
                    </div>
                </div>
            </header>
            <section className="card" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>?怨뚯퍢 ??곸뜚 ?곕뗄??/h2>
                        <button className="btn" onClick={() => setDischargeScoreModalOpen(true)}>??곸뜚?癒?땾</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>?紐껋삋?곕뗄??/h2>
                        <button className="btn" onClick={() => setOutpatientScoreModalOpen(true)}>?紐껋삋?癒?땾</button>
                    </div>

                    <div>
                        <h2 style={{ marginBottom: '0.5rem' }}>?諭彛??? ??낆쨮??/h2>
                        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Upload</p>
                    </div>

                    <div>
                        <h2 style={{ marginBottom: '0.5rem' }}>筌ㅼ뮄???낆쨮??/h2>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>?遺쎌퍢 ?遺용튋 獄???뤿떊 ?怨멸쉭??곷열</h2>
                        <button className="btn" onClick={() => setCategoryModalOpen(true)}>?브쑴鍮욆퉪??癒?땾</button>
                    </div>

                    <div>
                        <h2 style={{ margin: 0 }}>?臾롰닋???딅맪鍮 (suture)</h2>
                    </div>
                </div>
            </section>
            {categoryModalOpen && (
                <div className="modal-overlay" onClick={() => setCategoryModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>null</h3>
                        <p>null</p>
                    </div>
                </div>
            )}

            {dischargeScoreModalOpen && (
                <div className="modal-overlay" onClick={() => setDischargeScoreModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>null</h3>
                        <p>null</p>
                    </div>
                </div>
            )}

            {outpatientScoreModalOpen && (
                <div className="modal-overlay" onClick={() => setOutpatientScoreModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>null</h3>
                        <p>null</p>
                    </div>
                </div>
            )}

            {detailModal.show && (
                <div className="modal-overlay" onClick={() => setDetailModal({ ...detailModal, show: false })}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>null</h3>
                        <p>null</p>
                    </div>
                </div>
            )}
        </div>

    )
}

export default App

