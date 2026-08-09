import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [repairs, setRepairs] = useState([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [issue, setIssue] = useState('')
  const [cost, setCost] = useState('')

  // 1. Fetch repairs from Supabase on load
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

  // 2. Add new repair job to Supabase
  async function handleAddRepair(e) {
    e.preventDefault()
    if (!customerName || !phoneNumber || !deviceModel) {
      alert('Please fill in Customer Name, Phone Number, and Device Model.')
      return
    }

    // Format phone number to international format without + sign (e.g., 94771234567)
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
      // Clear form and refresh list
      setCustomerName('')
      setPhoneNumber('')
      setDeviceModel('')
      setIssue('')
      setCost('')
      fetchRepairs()
    }
  }

  // 3. Update repair status in Supabase
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

  // 4. Send WhatsApp Notification
  function sendWhatsAppNotification(job) {
    let message = ''
    if (job.status === 'Ready') {
      message = `Hi ${job.customer_name}! Your ${job.device_model} repair is completed and ready for pickup at our shop. Total amount due: LKR ${job.cost}. Thank you!`
    } else if (job.status === 'In Progress') {
      message = `Hi ${job.customer_name}! We are currently working on your ${job.device_model} (${job.issue}). We will update you once it is ready.`
    } else {
      message = `Hi ${job.customer_name}! We have received your ${job.device_model} for repair. Job ID: #${job.id}. Estimated cost: LKR ${job.cost}.`
    }

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${job.phone_number}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>FixTrack</h1>
        <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Repair Shop Dashboard</p>
      </header>

      {/* NEW REPAIR FORM */}
      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Log New Repair Job</h2>
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
        <h2>Active Repair Jobs</h2>
        {loading ? (
          <p>Loading repairs from database...</p>
        ) : repairs.length === 0 ? (
          <p>No repair jobs logged yet. Add your first job above!</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left' }}>
                  <th style={styles.th}>Job #</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Device</th>
                  <th style={styles.th}>Issue</th>
                  <th style={styles.th}>Cost (LKR)</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {repairs.map((job) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={styles.td}>#{job.id}</td>
                    <td style={styles.td}>
                      <strong>{job.customer_name}</strong>
                      <br />
                      <small>{job.phone_number}</small>
                    </td>
                    <td style={styles.td}>{job.device_model}</td>
                    <td style={styles.td}>{job.issue || '-'}</td>
                    <td style={styles.td}>{job.cost ? `LKR ${job.cost}` : '-'}</td>
                    <td style={styles.td}>
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
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => sendWhatsAppNotification(job)}
                        style={styles.btnWhatsApp}
                      >
                        💬 Notify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline Styles for instant clean UI
const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
    color: '#0f172a',
  },
  header: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    color: '#0f172a',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px',
  },
  input: {
    padding: '10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  btnWhatsApp: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
    color: '#0f172a',
  },
  th: {
    padding: '10px',
    borderBottom: '2px solid #cbd5e1',
    color: '#0f172a',
  },
  td: {
    padding: '10px',
    color: '#0f172a',
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
    padding: '6px 10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  }
}