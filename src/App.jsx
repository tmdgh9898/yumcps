import { useEffect, useMemo, useState } from 'react'
import api from './api/client'
import './index.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

const MONTHS = [
  '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04',
  '2026-05', '2026-06', '2026-07', '2026-08',
]

function App() {
  const [selectedMonth, setSelectedMonth] = useState('2026-02')
  const [reportsByMonth, setReportsByMonth] = useState({})
  const [recentLogs, setRecentLogs] = useState([])
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [detailModal, setDetailModal] = useState({ show: false, professor: '', cases: [] })
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryScoreData, setCategoryScoreData] = useState(null)
  const [categoryStartMonth, setCategoryStartMonth] = useState('2025-09')
  const [categoryEndMonth, setCategoryEndMonth] = useState('2026-02')

  const monthOptions = useMemo(() => MONTHS.map((m) => ({ key: m, label: m.replace('-', '.') })), [])
  const report = reportsByMonth[selectedMonth] || { professors: [], outpatient: { total_first: 0, total_re: 0, total_er_first: 0, total_er_suture: 0 } }

  async function fetchDashboard() {
    const monthKeys = MONTHS.join(',')
    const res = await api.get(`${API_BASE}/api/dashboard`, { params: { months: monthKeys } })
    setReportsByMonth(res.data.reports || {})
    setRecentLogs(res.data.recentLogs || [])
  }

  useEffect(() => {
    fetchDashboard().catch((err) => setMessage(err.message))
  }, [])

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

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

  async function showCases(professor) {
    try {
      const res = await api.get(`${API_BASE}/api/cases/${selectedMonth}/${professor}`)
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

  function handleDownload() {
    window.location.href = `${API_BASE}/api/export/${selectedMonth}`
  }

  async function openCategoryScore() {
    try {
      const res = await api.get(`${API_BASE}/api/category-score`, {
        params: {
          start_month: categoryStartMonth,
          end_month: categoryEndMonth,
          multiplier: 2,
        },
      })
      setCategoryScoreData(res.data)
      setCategoryModalOpen(true)
    } catch (err) {
      setMessage('Category score failed: ' + err.message)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>YUMC PS</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Monthly Report Automation</p>
      </header>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <h2>Upload Daily Logs</h2>
        <input type="file" multiple accept=".xlsx" onChange={handleFileUpload} disabled={uploading} />
        <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>{message}</p>
      </section>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <h2>Month Selection</h2>
        <div className="month-selector">
          {monthOptions.map((m) => (
            <button
              key={m.key}
              className="btn"
              onClick={() => setSelectedMonth(m.key)}
              style={{ opacity: selectedMonth === m.key ? 1 : 0.7 }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button className="btn" onClick={handleDownload}>Download Monthly XLSX</button>
          <button className="btn" onClick={openCategoryScore}>Category Score</button>
        </div>
      </section>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <h2>Professor Monthly Summary ({selectedMonth})</h2>
        <table>
          <thead>
            <tr>
              <th>Professor</th>
              <th>General</th>
              <th>Local</th>
              <th>Etc</th>
              <th>Admission</th>
              <th>Discharge</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(report.professors || []).map((p) => (
              <tr key={p.professor_name}>
                <td>{p.professor_name}</td>
                <td>{p.total_general || 0}</td>
                <td>{p.total_local || 0}</td>
                <td>{(p.total_mac || 0) + (p.total_bpb || 0) + (p.total_snb || 0) + (p.total_fnb || 0) + (p.total_spinal || 0)}</td>
                <td>{p.total_admission || 0}</td>
                <td>{p.total_discharge || 0}</td>
                <td><button className="btn" onClick={() => showCases(p.professor_name)}>Cases</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <h2>Outpatient / ER Summary</h2>
        <table>
          <thead>
            <tr>
              <th>First Visit</th>
              <th>Re-Visit</th>
              <th>ER First</th>
              <th>ER Suture</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{report.outpatient?.total_first || 0}</td>
              <td>{report.outpatient?.total_re || 0}</td>
              <td>{report.outpatient?.total_er_first || 0}</td>
              <td>{report.outpatient?.total_er_suture || 0}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Recent Logs</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total Surgery</th>
              <th>Admission</th>
              <th>Discharge</th>
              <th>ER First</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => (
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
      </section>

      {detailModal.show && (
        <div className="modal-overlay" onClick={() => setDetailModal({ show: false, professor: '', cases: [] })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{detailModal.professor} Cases</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Case</th>
                  <th>Anesthesia</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {detailModal.cases.map((c, idx) => (
                  <tr key={`${c.date}-${idx}`}>
                    <td>{c.date}</td>
                    <td>{c.patient_name}</td>
                    <td>{c.case_name}</td>
                    <td>{c.anesthesia}</td>
                    <td>{c.total_count}</td>
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
            <h3>Category Score</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <select value={categoryStartMonth} onChange={(e) => setCategoryStartMonth(e.target.value)}>
                {MONTHS.map((m) => <option key={`s-${m}`} value={m}>{m}</option>)}
              </select>
              <select value={categoryEndMonth} onChange={(e) => setCategoryEndMonth(e.target.value)}>
                {MONTHS.map((m) => <option key={`e-${m}`} value={m}>{m}</option>)}
              </select>
              <button className="btn" onClick={openCategoryScore}>Refresh</button>
            </div>

            {categoryScoreData && (
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Raw Sum</th>
                    <th>Adjusted</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryScoreData.rows.map((r) => (
                    <tr key={r.category_key}>
                      <td>{r.category_label}</td>
                      <td>{r.raw_sum}</td>
                      <td>{r.adjusted_sum}</td>
                      <td>{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
