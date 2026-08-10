import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const urlParams = new URLSearchParams(window.location.search)
  const trackingJobId = urlParams.get('track')

  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Auth Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // Dashboard State
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [editingJob, setEditingJob] = useState(null)

  // New Job Form State
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [issue, setIssue] = useState('')
  const [cost, setCost] = useState('')

  // Check auth session on startup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch repairs when authenticated or when tracking a job
  useEffect(() => {
    if (session || trackingJobId) {
      fetchRepairs()
    }
  }, [session, trackingJobId])

  async function fetchRepairs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .order('id', { ascending: false })

    if (error) {
      console.error('Error fetching repairs:', error)
    } else {
      setRepairs(data || [])
    }
    setLoading(false)
  }

  // --- AUTHENTICATION HANDLERS ---
  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) setAuthError(error.message)
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setAuthError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) setAuthError(error.message)
    else alert('Account created! You are now logged in.')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setRepairs([])
  }

  // --- CSV EXPORT FUNCTION ---
  function exportToCSV() {
    if (repairs.length === 0) {
      alert('No repair data available to export.')
      return
    }

    const headers = ['Job ID', 'Customer Name', 'Phone', 'Device Model', 'Issue', 'Cost (LKR)', 'Status', 'Created At']
    const rows = repairs.map((job) => [
      job.id,
      `"${job.customer_name || ''}"`,
      `"${job.phone_number || ''}"`,
      `"${job.device_model || ''}"`,
      `"${job.issue || ''}"`,
      job.cost || 0,
      job.status || 'Received',
      job.created_at || '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `FixTrack_Repairs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // --- CUSTOMER TRACKING VIEW (Public Access) ---
  if (trackingJobId) {
    const trackedJob = repairs.find((j) => j.id.toString() === trackingJobId)

    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={{ margin: 0, fontSize: '22px' }}>FixTrack</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '13px' }}>
            Live Repair Status
          </p>
        </header>

        <div style={styles.card}>
          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading status...</p>
          ) : !trackedJob ? (
            <p style={{ textAlign: 'center', color: '#ef4444' }}>
              Repair Job #{trackingJobId} not found. Please check your link.
            </p>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 5px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Job Tracking ID
              </span>
              <h2 style={{ fontSize: '32px', margin: '4px 0 16px 0', color: '#0f172a' }}>
                #{trackedJob.id}
              </h2>

              <div
                style={{
                  ...getStatusStyle(trackedJob.status),
                  display: 'inline-block',
                  fontSize: '16px',
                  padding: '8px 18px',
                  borderRadius: '20px',
                  marginBottom: '20px',
                }}
              >
                {trackedJob.status}
              </div>

              <div style={styles.trackingBox}>
                <p style={styles.trackingRow}>
                  <span>Customer:</span> <strong>{trackedJob.customer_name}</strong>
                </p>
                <p style={styles.trackingRow}>
                  <span>Device:</span> <strong>{trackedJob.device_model}</strong>
                </p>
                <p style={styles.trackingRow}>
                  <span>Issue / Fault:</span>{' '}
                  <strong>{trackedJob.issue || 'General Service'}</strong>
                </p>
                <p style={styles.trackingRow}>
                  <span>Total Amount:</span>{' '}
                  <strong>LKR {trackedJob.cost || 0}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- LOGIN SCREEN FOR SHOPKEEPERS ---
  if (authLoading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading FixTrack...</div>
  }

  if (!session) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={{ margin: 0, fontSize: '22px' }}>FixTrack</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '13px' }}>
            Shopkeeper Sign In
          </p>
        </header>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sign In to Your Shop Account</h2>
          {authError && (
            <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '14px' }}>
              {authError}
            </div>
          )}
          <form onSubmit={handleLogin} style={styles.formGrid}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="shop@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />

            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button type="submit" style={styles.btnPrimary}>
                Log In
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                style={styles.btnSecondary}
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // --- DASHBOARD FUNCTIONS ---
  async function handleAddRepair(e) {
    e.preventDefault()
    if (!customerName || !phoneNumber || !deviceModel) {
      alert('Please enter Customer Name, Phone Number, and Device Model.')
      return
    }

    let formattedPhone = phoneNumber.trim()
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '94' + formattedPhone.slice(1)
    }

    const { error } = await supabase.from('repairs').insert([
      {
        customer_name: customerName,
        phone_number: formattedPhone,
        device_model: deviceModel,
        issue: issue,
        cost: cost ? parseInt(cost) : 0,
        status: 'Received',
        user_id: session.user.id,
      },
    ])

    if (error) {
      alert('Error saving job: ' + error.message)
    } else {
      setCustomerName('')
      setPhoneNumber('')
      setDeviceModel('')
      setIssue('')
      setCost('')
      fetchRepairs()
    }
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from('repairs')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      alert('Error updating status: ' + error.message)
    } else {
      fetchRepairs()
    }
  }

  async function deleteRepair(id) {
    if (!window.confirm(`Are you sure you want to permanently delete Job #${id}?`))
      return
    const { error } = await supabase.from('repairs').delete().eq('id', id)
    if (error) alert('Error deleting job: ' + error.message)
    else {
      setActiveMenuId(null)
      fetchRepairs()
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    const { id, customer_name, phone_number, device_model, issue, cost } = editingJob

    let formattedPhone = phone_number.trim()
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '94' + formattedPhone.slice(1)
    }

    const { error } = await supabase
      .from('repairs')
      .update({
        customer_name,
        phone_number: formattedPhone,
        device_model,
        issue,
        cost: parseInt(cost) || 0,
      })
      .eq('id', id)

    if (error) {
      alert('Error updating job details: ' + error.message)
    } else {
      setEditingJob(null)
      fetchRepairs()
    }
  }

  function sendWhatsAppNotification(job) {
    const trackingLink = `${window.location.origin}?track=${job.id}`

    let message = ''
    if (job.status === 'Ready') {
      message = `Hi ${job.customer_name}! Your ${job.device_model} repair is completed and ready for pickup! Total due: LKR ${job.cost}.\n\nTrack status: ${trackingLink}`
    } else if (job.status === 'In Progress') {
      message = `Hi ${job.customer_name}! We are working on your ${job.device_model} (${job.issue}).\n\nTrack progress: ${trackingLink}`
    } else {
      message = `Hi ${job.customer_name}! We received your ${job.device_model} for repair. Job ID: #${job.id}. Cost: LKR ${job.cost}.\n\nTrack status live: ${trackingLink}`
    }

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${job.phone_number}?text=${encodedMessage}`, '_blank')
  }

  function formatDisplayPhone(phone) {
    if (!phone) return ''
    if (phone.startsWith('94') && phone.length === 11) {
      return '0' + phone.slice(2)
    }
    return phone
  }

  const activeJobs = repairs.filter((j) => j.status !== 'Delivered')
  const completedJobs = repairs.filter((j) => j.status === 'Delivered')

  const displayedJobs = (activeTab === 'active' ? activeJobs : completedJobs).filter(
    (job) => {
      const query = searchQuery.toLowerCase()
      return (
        job.customer_name?.toLowerCase().includes(query) ||
        job.phone_number?.includes(query) ||
        job.device_model?.toLowerCase().includes(query) ||
        job.status?.toLowerCase().includes(query)
      )
    }
  )

  return (
    <div style={styles.container} onClick={() => setActiveMenuId(null)}>
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>FixTrack</h1>
          <p style={{ margin: '2px 0 0 0', opacity: 0.9, fontSize: '13px' }}>
            {session.user.email}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={exportToCSV} style={styles.btnExport} title="Export to Excel / CSV">
            📥 Export CSV
          </button>
          <button onClick={handleLogout} style={styles.btnLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* NEW REPAIR FORM */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Log New Repair Job</h2>
        <form onSubmit={handleAddRepair} style={styles.formGrid}>
          <input
            type="text"
            placeholder="Customer Name *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="WhatsApp Phone (e.g. 0771234567) *"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Device Model (e.g. iPhone 11) *"
            value={deviceModel}
            onChange={(e) => setDeviceModel(e.target.value)}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Issue / Fault (e.g. Display Replacement)"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Cost (LKR)"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.btnPrimary}>
            Save Job
          </button>
        </form>
      </div>

      {/* REPAIRS SECTION WITH TABS */}
      <div style={styles.card}>
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab('active')}
            style={activeTab === 'active' ? styles.tabActive : styles.tabInactive}
          >
            Active Repairs ({activeJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            style={
              activeTab === 'completed' ? styles.tabActive : styles.tabInactive
            }
          >
            Completed ({completedJobs.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="🔍 Search customer, device, phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>Loading database...</p>
        ) : displayedJobs.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
            {activeTab === 'active'
              ? 'No active repair jobs right now.'
              : 'No completed repairs found.'}
          </p>
        ) : (
          <div style={styles.jobList}>
            {displayedJobs.map((job) => (
              <div key={job.id} style={styles.jobCard}>
                <div style={styles.jobCardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={styles.jobId}>#{job.id}</span>
                    <strong style={{ fontSize: '16px', marginLeft: '8px' }}>
                      {job.customer_name}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={job.status}
                      onChange={(e) => updateStatus(job.id, e.target.value)}
                      style={getStatusStyle(job.status)}
                    >
                      <option value="Received">Received</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Ready">Ready</option>
                      <option value="Delivered">Delivered</option>
                    </select>

                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuId(activeMenuId === job.id ? null : job.id)
                        }}
                        style={styles.btnMenuDots}
                      >
                        ⋮
                      </button>

                      {activeMenuId === job.id && (
                        <div style={styles.dropdownMenu}>
                          <button
                            onClick={() => {
                              setEditingJob(job)
                              setActiveMenuId(null)
                            }}
                            style={styles.dropdownItem}
                          >
                            ✏️ Edit Details
                          </button>
                          <button
                            onClick={() => deleteRepair(job.id)}
                            style={{ ...styles.dropdownItem, color: '#ef4444' }}
                          >
                            🗑️ Delete Job
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={styles.jobCardBody}>
                  <p style={styles.jobText}>
                    <span>📱 Device:</span> <strong>{job.device_model}</strong>
                  </p>
                  <p style={styles.jobText}>
                    <span>🔧 Fault:</span> <strong>{job.issue || '-'}</strong>
                  </p>
                  <p style={styles.jobText}>
                    <span>📞 Phone:</span>{' '}
                    <strong>{formatDisplayPhone(job.phone_number)}</strong>
                  </p>
                  <p style={styles.jobText}>
                    <span>💰 Cost:</span> <strong>LKR {job.cost || 0}</strong>
                  </p>
                </div>

                {job.status !== 'Delivered' && (
                  <div style={styles.jobCardActions}>
                    <button
                      onClick={() => sendWhatsAppNotification(job)}
                      style={styles.btnWhatsApp}
                    >
                      💬 Send WhatsApp Status Link
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL OVERLAY */}
      {editingJob && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Edit Job #{editingJob.id}</h3>
            <form onSubmit={handleSaveEdit} style={styles.formGrid}>
              <label style={styles.label}>Customer Name</label>
              <input
                type="text"
                value={editingJob.customer_name}
                onChange={(e) =>
                  setEditingJob({ ...editingJob, customer_name: e.target.value })
                }
                style={styles.input}
              />

              <label style={styles.label}>WhatsApp Phone</label>
              <input
                type="text"
                value={formatDisplayPhone(editingJob.phone_number)}
                onChange={(e) =>
                  setEditingJob({ ...editingJob, phone_number: e.target.value })
                }
                style={styles.input}
              />

              <label style={styles.label}>Device Model</label>
              <input
                type="text"
                value={editingJob.device_model}
                onChange={(e) =>
                  setEditingJob({ ...editingJob, device_model: e.target.value })
                }
                style={styles.input}
              />

              <label style={styles.label}>Issue / Fault</label>
              <input
                type="text"
                value={editingJob.issue || ''}
                onChange={(e) =>
                  setEditingJob({ ...editingJob, issue: e.target.value })
                }
                style={styles.input}
              />

              <label style={styles.label}>Cost (LKR)</label>
              <input
                type="number"
                value={editingJob.cost || ''}
                onChange={(e) =>
                  setEditingJob({ ...editingJob, cost: e.target.value })
                }
                style={styles.input}
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={styles.btnPrimary}>
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  style={styles.btnCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f1f5f9',
    minHeight: '100vh',
    padding: '12px',
    maxWidth: '650px',
    margin: '0 auto',
    color: '#0f172a',
  },
  header: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    marginBottom: '16px',
  },
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: '17px',
    color: '#0f172a',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: '-6px',
  },
  searchInput: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '14px',
  },
  input: {
    padding: '11px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    width: '100%',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '11px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    flex: 1,
  },
  btnSecondary: {
    backgroundColor: '#e2e8f0',
    color: '#334155',
    border: 'none',
    padding: '11px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    flex: 1,
  },
  btnCancel: {
    backgroundColor: '#cbd5e1',
    color: '#334155',
    border: 'none',
    padding: '11px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    flex: 1,
  },
  btnLogout: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px',
  },
  btnExport: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px',
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '8px',
    marginBottom: '12px',
  },
  tabActive: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tabInactive: {
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
  },
  jobList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  jobCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  jobCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  jobId: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  btnMenuDots: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#64748b',
    cursor: 'pointer',
    padding: '0 6px',
  },
  dropdownMenu: {
    position: 'absolute',
    right: 0,
    top: '28px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10,
    minWidth: '130px',
    overflow: 'hidden',
  },
  dropdownItem: {
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'block',
  },
  jobCardBody: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    marginBottom: '10px',
  },
  jobText: {
    margin: 0,
    fontSize: '13px',
    color: '#334155',
  },
  jobCardActions: {
    borderTop: '1px solid #f1f5f9',
    paddingTop: '10px',
  },
  btnWhatsApp: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    width: '100%',
    fontSize: '13px',
    cursor: 'pointer',
  },
  trackingBox: {
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    padding: '14px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  trackingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: '8px 0',
    fontSize: '14px',
    color: '#334155',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '16px',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '450px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
}

function getStatusStyle(status) {
  let bg = '#e2e8f0'
  let color = '#334155'
  if (status === 'Received') { bg = '#fef08a'; color = '#854d0e'; }
  if (status === 'In Progress') { bg = '#bae6fd'; color = '#0369a1'; }
  if (status === 'Ready') { bg = '#bbf7d0'; color = '#15803d'; }
  if (status === 'Delivered') { bg = '#e2e8f0'; color = '#64748b'; }

  return {
    backgroundColor: bg,
    color: color,
    border: 'none',
    padding: '5px 10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px',
  }
}