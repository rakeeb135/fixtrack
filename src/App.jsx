import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  // Simple routing check for Customer Tracking Link (?track=JOB_ID)
  const urlParams = new URLSearchParams(window.location.search)
  const trackingJobId = urlParams.get('track')

  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Form State
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [issue, setIssue] = useState('')
  const [cost, setCost] = useState('')

  useEffect(() => {
    fetchRepairs()
  }, [])

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

  // --- CUSTOMER TRACKING VIEW ---
  if (trackingJobId) {
    const trackedJob = repairs.find((j) => j.id.toString() === trackingJobId)

    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={{ margin: 0 }}>FixTrack</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Customer Status Tracker</p>
        </header>

        <div style={styles.card}>
          {loading ? (
            <p style={{ textAlign: 'center' }}>Loading status...</p>
          ) : !trackedJob ? (
            <p style={{ textAlign: 'center', color: '#ef4444' }}>
              Repair Job #{trackingJobId} not found. Please verify your link.
            </p>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}>Repair Job ID</span>
              <h2 style={{ fontSize: '28px', margin: '5px 0 15px 0' }}>#{trackedJob.id}</h2>

              <div
                style={{
                  ...getStatusStyle(trackedJob.status),
                  display: 'inline-block',
                  fontSize: '18px',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  marginBottom: '20px',
                }}
              >
                {trackedJob.status}
              </div>

              <div style={styles.trackingDetails}>
                <p><strong>Customer:</strong> {trackedJob.customer_name}</p>
                <p><strong>Device:</strong> {trackedJob.device_model}</p>
                <p><strong>Issue:</strong> {trackedJob.issue || 'General Repair'}</p>
                <p><strong>Estimated Cost:</strong> LKR {trackedJob.cost}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- SHOPKEEPER DASHBOARD VIEW ---
  async function handleAddRepair(e) {
    e.preventDefault()
    if (!customerName || !phoneNumber || !deviceModel) {
      alert('Please fill in Customer Name, Phone Number, and Device Model.')
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
      },
    ])

    if (error) {
      alert('Error adding repair job: ' + error.message)
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
    if (!window.confirm(`Are you sure you want to delete Job #${id}?`)) return
    const { error } = await supabase.from('repairs').delete().eq('id', id)
    if (error) alert('Error deleting job: ' + error.message)
    else fetchRepairs()
  }

  function sendWhatsAppNotification(job) {
    const trackingLink = `${window.location.origin}?track=${job.id}`

    let message = ''
    if (job.status === 'Ready') {
      message = `Hi ${job.customer_name}! Your ${job.device_model} is repaired and ready for pickup! Total: LKR ${job.cost}.\n\nTrack status: ${trackingLink}`
    } else if (job.status === 'In Progress') {
      message = `Hi ${job.customer_name}! We are currently working on your ${job.device_model} (${job.issue}).\n\nTrack progress live here: ${trackingLink}`
    } else {
      message = `Hi ${job.customer_name}! We received your ${job.device_model} for repair. Job ID: #${job.id}. Cost: LKR ${job.cost}.\n\nTrack your repair status live here: ${trackingLink}`
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

  const filteredRepairs = repairs.filter((job) => {
    const query = searchQuery.toLowerCase()
    return (
      job.customer_name?.toLowerCase().includes(query) ||
      job.phone_number?.includes(query) ||
      job.device_model?.toLowerCase().includes(query) ||
      job.status?.toLowerCase().includes(query)
    )
  })

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>FixTrack</h1>
        <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
          Repair Shop Management
        </p>
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

      {/* ACTIVE REPAIRS LEDGER */}
      <div style={styles.card}>
        <div style={styles.tableHeaderSection}>
          <h2 style={styles.cardTitle}>Active Repairs ({filteredRepairs.length})</h2>
          <input
            type="text"
            placeholder="🔍 Search customer, device..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {loading ? (
          <p>Loading repairs from database...</p>
        ) : filteredRepairs.length === 0 ? (
          <p>No repair jobs found.</p>
        ) : (
          <div style={styles.jobList}>
            {filteredRepairs.map((job) => (
              <div key={job.id} style={styles.jobCard}>
                <div style={styles.jobCardHeader}>
                  <div>
                    <span style={styles.jobId}>#{job.id}</span>
                    <strong style={{ fontSize: '16px', marginLeft: '8px' }}>
                      {job.customer_name}
                    </strong>
                  </div>
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
                </div>

                <div style={styles.jobCardBody}>
                  <p style={styles.jobText}>
                    <strong>📱 Device:</strong> {job.device_model}
                  </p>
                  <p style={styles.jobText}>
                    <strong>🔧 Fault:</strong> {job.issue || '-'}
                  </p>
                  <p style={styles.jobText}>
                    <strong>📞 Phone:</strong> {formatDisplayPhone(job.phone_number)}
                  </p>
                  <p style={styles.jobText}>
                    <strong>💰 Cost:</strong> LKR {job.cost || 0}
                  </p>
                </div>

                <div style={styles.jobCardActions}>
                  <button
                    onClick={() => sendWhatsAppNotification(job)}
                    disabled={job.status === 'Delivered'}
                    style={{
                      ...styles.btnWhatsApp,
                      opacity: job.status === 'Delivered' ? 0.4 : 1,
                      cursor: job.status === 'Delivered' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {job.status === 'Delivered' ? 'Completed' : '💬 Notify Link'}
                  </button>
                  <button
                    onClick={() => deleteRepair(job.id)}
                    style={styles.btnDelete}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f1f5f9',
    minHeight: '100vh',
    padding: '12px',
    maxWidth: '700px',
    margin: '0 auto',
    color: '#0f172a',
  },
  header: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '16px 20px',
    borderRadius: '12px',
    marginBottom: '16px',
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
    fontSize: '18px',
    color: '#0f172a',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    padding: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
    width: '100%',
    boxSizing: 'border-box',
  },
  tableHeaderSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '12px',
  },
  searchInput: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
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
    backgroundColor: '#f8fafc',
  },
  jobCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  jobId: {
    backgroundColor: '#e2e8f0',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  jobCardBody: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    marginBottom: '12px',
  },
  jobText: {
    margin: 0,
    fontSize: '14px',
    color: '#334155',
  },
  jobCardActions: {
    display: 'flex',
    gap: '10px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '10px',
  },
  btnWhatsApp: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    flex: 2,
    fontSize: '14px',
  },
  btnDelete: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    flex: 1,
    cursor: 'pointer',
    fontSize: '14px',
  },
  trackingDetails: {
    textAlign: 'left',
    backgroundColor: '#f8fafc',
    padding: '16px',
    borderRadius: '10px',
    lineHeight: '1.8',
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
    padding: '6px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
  }
}