import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const MASTER_ADMIN_EMAIL = 'rakeebroomy@gmail.com'
const YOUR_WHATSAPP_NUMBER = '94772795212' // Your phone number for receipts

export default function App() {
  const urlParams = new URLSearchParams(window.location.search)
  const trackingJobId = urlParams.get('track')

  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
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

  // Admin Dashboard State
  const [adminView, setAdminView] = useState(false)
  const [allProfiles, setAllProfiles] = useState([])
  const [newShopEmail, setNewShopEmail] = useState('')
  const [newShopPassword, setNewShopPassword] = useState('')
  const [newShopRate, setNewShopRate] = useState(2000)
  const [newShopPlan, setNewShopPlan] = useState('trial')
  const [editingRateProfile, setEditingRateProfile] = useState(null)

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
      if (session) fetchUserProfile(session.user)
      else setAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchUserProfile(session.user)
      else {
        setProfile(null)
        setAuthLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
    } else if (data) {
      setProfile(data)
    } else {
      // Fallback if profile trigger is pending
      const isAdmin = user.email === MASTER_ADMIN_EMAIL
      setProfile({
        id: user.id,
        email: user.email,
        role: isAdmin ? 'admin' : 'shop',
        status: 'active',
        monthly_rate: 2000,
        expiry_date: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }
    setAuthLoading(false)
  }

  // Fetch repairs when authenticated or when tracking a job
  useEffect(() => {
    if (session || trackingJobId) {
      fetchRepairs()
    }
  }, [session, trackingJobId])

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllProfiles()
    }
  }, [profile])

  async function fetchRepairs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching repairs:', error)
    } else {
      setRepairs(data || [])
    }
    setLoading(false)
  }

  async function fetchAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setAllProfiles(data || [])
  }

  // Helper formatting functions
  function formatDate(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    return d.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  function formatDisplayPhone(phone) {
    if (!phone) return ''
    if (phone.startsWith('94') && phone.length === 11) {
      return '0' + phone.slice(2)
    }
    return phone
  }

  // Calculate Days Remaining
  function getDaysRemaining() {
    if (!profile?.expiry_date) return 999
    const diffTime = new Date(profile.expiry_date) - new Date()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const daysLeft = getDaysRemaining()
  const isExpired = profile?.role !== 'admin' && (daysLeft <= 0 || profile?.status === 'suspended')
  const isNearExpiry = profile?.role !== 'admin' && daysLeft > 0 && daysLeft <= 3

  // Map each shop's repairs to a relative #1, #2, #3 numbering
  const repairsWithShopNum = repairs.map((job, idx) => ({
    ...job,
    shopNum: idx + 1,
  }))

  const sortedRepairs = [...repairsWithShopNum].reverse()
  const activeJobs = sortedRepairs.filter((j) => j.status !== 'Delivered')
  const completedJobs = sortedRepairs.filter((j) => j.status === 'Delivered')

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

  async function handleLogout() {
    await supabase.auth.signOut()
    setRepairs([])
    setProfile(null)
    setAdminView(false)
  }

  // --- ADMIN ACTIONS ---
  async function handleCreateShopAccount(e) {
    e.preventDefault()
    if (!newShopEmail || !newShopPassword) {
      alert('Please enter shop email and password.')
      return
    }

    const initialExpiry = newShopPlan === 'trial'
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase.auth.signUp({
      email: newShopEmail,
      password: newShopPassword,
    })

    if (error) {
      alert('Error creating account: ' + error.message)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert([
        {
          id: data.user.id,
          email: newShopEmail,
          role: 'shop',
          status: newShopPlan === 'trial' ? 'trial' : 'active',
          monthly_rate: parseInt(newShopRate) || 2000,
          expiry_date: initialExpiry,
        },
      ])

      alert(`Account created successfully for ${newShopEmail}!`)
      setNewShopEmail('')
      setNewShopPassword('')
      fetchAllProfiles()
    }
  }

  async function extendSubscription(targetProfile, monthsToAdd) {
    const currentExpiry = new Date(targetProfile.expiry_date || Date.now())
    const now = new Date()

    // Early renewal adds onto current expiry; late renewal starts from today
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate.setMonth(baseDate.getMonth() + monthsToAdd)).toISOString()

    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'active',
        expiry_date: newExpiry,
      })
      .eq('id', targetProfile.id)

    if (error) alert('Error extending subscription: ' + error.message)
    else fetchAllProfiles()
  }

  async function toggleShopStatus(targetProfile) {
    const newStatus = targetProfile.status === 'suspended' ? 'active' : 'suspended'
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', targetProfile.id)

    if (error) alert('Error updating status: ' + error.message)
    else fetchAllProfiles()
  }

  async function updateMonthlyRate(e) {
    e.preventDefault()
    const { error } = await supabase
      .from('profiles')
      .update({ monthly_rate: parseInt(editingRateProfile.monthly_rate) || 2000 })
      .eq('id', editingRateProfile.id)

    if (error) alert('Error updating rate: ' + error.message)
    else {
      setEditingRateProfile(null)
      fetchAllProfiles()
    }
  }

  async function deleteShopAccount(targetProfile) {
    if (!window.confirm(`⚠️ ARE YOU SURE? This will permanently delete ${targetProfile.email} and ALL their repair records!`))
      return

    const { error } = await supabase.from('profiles').delete().eq('id', targetProfile.id)
    if (error) alert('Error deleting shop: ' + error.message)
    else fetchAllProfiles()
  }

  // --- CLEAN CSV EXPORT FUNCTION ---
  function exportToCSV() {
    if (repairs.length === 0) {
      alert('No repair data available to export.')
      return
    }

    const headers = [
      'Job Number',
      'Customer Name',
      'Phone Number',
      'Device Model',
      'Issue Fault',
      'Cost LKR',
      'Status',
      'Date Logged',
    ]

    const rows = repairsWithShopNum.map((job) => [
      `"#${job.shopNum}"`,
      `"${job.customer_name || ''}"`,
      `"\t${formatDisplayPhone(job.phone_number)}"`,
      `"${job.device_model || ''}"`,
      `"${job.issue || ''}"`,
      job.cost || 0,
      `"${job.status || 'Received'}"`,
      `"${formatDate(job.created_at)}"`,
    ])

    const csvString = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `FixTrack_Ledger_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function sendRenewalWhatsApp() {
    const rate = profile?.monthly_rate || 2000
    const message = `Hi! I am the owner of ${session?.user?.email}. I want to renew my FixTrack subscription (LKR ${rate}/month). Here is my payment receipt screenshot:`
    window.open(`https://wa.me/${YOUR_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank')
  }

  // --- CUSTOMER TRACKING VIEW (Public Access) ---
  if (trackingJobId) {
    const trackedJob = repairsWithShopNum.find((j) => j.id.toString() === trackingJobId)

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
              Repair Job not found. Please check your tracking link.
            </p>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 5px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Shop Ticket Number
              </span>
              <h2 style={{ fontSize: '32px', margin: '4px 0 16px 0', color: '#0f172a' }}>
                #{trackedJob.shopNum}
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
                <p style={styles.trackingRow}>
                  <span>Logged Date:</span>{' '}
                  <strong>{formatDate(trackedJob.created_at)}</strong>
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

            <button type="submit" style={{ ...styles.btnPrimary, marginTop: '10px' }}>
              Log In
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- PAUSED / EXPIRED LOCK SCREEN ---
  if (isExpired) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px' }}>FixTrack</h1>
            <p style={{ margin: '2px 0 0 0', opacity: 0.9, fontSize: '12px' }}>
              {session.user.email}
            </p>
          </div>
          <button onClick={handleLogout} style={styles.btnLogout}>
            Sign Out
          </button>
        </header>

        <div style={{ ...styles.card, textAlign: 'center', padding: '24px 16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>☕</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>
            Workspace Paused
          </h2>
          <p style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5', marginBottom: '18px' }}>
            Your FixTrack subscription or trial period has ended. All your existing customer records and tracking links are safe and stored securely.
          </p>

          <div style={styles.bankBox}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e3a8a' }}>
              Bank Transfer Details
            </h4>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>
              <strong>Amount Due:</strong> LKR {profile?.monthly_rate || 2000} / month
            </p>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>
              <strong>Bank:</strong> Commercial Bank / Sampath Bank
            </p>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>
              <strong>Account Name:</strong> M.T.M Rakeeb
            </p>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>
              <strong>Account No:</strong> [Your Bank Acc Number]
            </p>
          </div>

          <button onClick={sendRenewalWhatsApp} style={styles.btnWhatsAppLarge}>
            💬 Send Receipt to Reactivate Workspace
          </button>
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
    if (!window.confirm(`Are you sure you want to permanently delete this job?`))
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
      message = `Hi ${job.customer_name}! We received your ${job.device_model} for repair. Cost: LKR ${job.cost}.\n\nTrack status live: ${trackingLink}`
    }

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/${job.phone_number}?text=${encodedMessage}`, '_blank')
  }

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
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>FixTrack</h1>
          <p style={{ margin: '2px 0 0 0', opacity: 0.9, fontSize: '12px' }}>
            {session.user.email} {profile?.role === 'admin' && '👑 (Admin)'}
          </p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', gap: '6px', alignItems: 'center' }}>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setAdminView(!adminView)}
              style={adminView ? styles.btnAdminActive : styles.btnAdmin}
            >
              {adminView ? '📱 App View' : '⚙️ Admin Panel'}
            </button>
          )}
          {!adminView && (
            <button onClick={exportToCSV} style={styles.btnExport} title="Export to Excel / CSV">
              📥 Export
            </button>
          )}
          <button onClick={handleLogout} style={styles.btnLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* NEAR EXPIRY WARNING BANNER */}
      {isNearExpiry && !adminView && (
        <div style={styles.warningBanner}>
          <div>
            <strong>👋 Subscription Renews in {daysLeft} Day{daysLeft > 1 ? 's' : ''}!</strong>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              Rate: LKR {profile?.monthly_rate || 2000}/month
            </div>
          </div>
          <button onClick={sendRenewalWhatsApp} style={styles.btnBannerPay}>
            💳 Pay & Renew
          </button>
        </div>
      )}

      {/* --- MASTER ADMIN PANEL VIEW --- */}
      {profile?.role === 'admin' && adminView ? (
        <div>
          {/* CREATE NEW SHOP ACCOUNT */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>➕ Onboard New Shopkeeper</h2>
            <form onSubmit={handleCreateShopAccount} style={styles.formGrid}>
              <input
                type="email"
                placeholder="Shop Email *"
                value={newShopEmail}
                onChange={(e) => setNewShopEmail(e.target.value)}
                style={styles.input}
                required
              />
              <input
                type="password"
                placeholder="Initial Password *"
                value={newShopPassword}
                onChange={(e) => setNewShopPassword(e.target.value)}
                style={styles.input}
                required
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="number"
                  placeholder="Monthly Rate (LKR)"
                  value={newShopRate}
                  onChange={(e) => setNewShopRate(e.target.value)}
                  style={styles.input}
                />
                <select
                  value={newShopPlan}
                  onChange={(e) => setNewShopPlan(e.target.value)}
                  style={styles.input}
                >
                  <option value="trial">14-Day Free Trial</option>
                  <option value="active">Active (30 Days)</option>
                </select>
              </div>
              <button type="submit" style={styles.btnPrimary}>
                Create Shop Account
              </button>
            </form>
          </div>

          {/* ALL SHOPS LIST */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📊 Client Shops ({allProfiles.length})</h2>
            <div style={styles.jobList}>
              {allProfiles.map((p) => {
                const pDiff = Math.ceil((new Date(p.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
                const pExpired = p.status === 'suspended' || pDiff <= 0

                return (
                  <div key={p.id} style={styles.adminShopCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '15px' }}>{p.email}</strong>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          Rate: <strong>LKR {p.monthly_rate || 2000}</strong> / mo
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Expires: <strong>{formatDate(p.expiry_date)}</strong> ({pDiff} days left)
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: pExpired ? '#fecdd3' : '#bbf7d0',
                          color: pExpired ? '#9f1239' : '#166534',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        {p.role === 'admin' ? '👑 Admin' : pExpired ? '🔴 Paused' : '🟢 Active'}
                      </span>
                    </div>

                    {p.role !== 'admin' && (
                      <div style={styles.adminActionsRow}>
                        <button onClick={() => extendSubscription(p, 1)} style={styles.btnQuickAdd}>
                          +1 Mo
                        </button>
                        <button onClick={() => extendSubscription(p, 6)} style={styles.btnQuickAdd}>
                          +6 Mo
                        </button>
                        <button onClick={() => extendSubscription(p, 12)} style={styles.btnQuickAdd}>
                          +1 Yr
                        </button>
                        <button onClick={() => setEditingRateProfile(p)} style={styles.btnEditRate}>
                          ✏️ Rate
                        </button>
                        <button onClick={() => toggleShopStatus(p)} style={styles.btnToggleStatus}>
                          {p.status === 'suspended' ? '▶️ Resume' : '⏸️ Pause'}
                        </button>
                        <button onClick={() => deleteShopAccount(p)} style={styles.btnDeleteShop}>
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* --- REGULAR SHOPKEEPER DASHBOARD --- */
        <div>
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
                type="tel"
                inputMode="tel"
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
                inputMode="numeric"
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
                style={activeTab === 'completed' ? styles.tabActive : styles.tabInactive}
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
                        <span style={styles.jobId}>#{job.shopNum}</span>
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

                    <div style={styles.dateLabel}>
                      📅 Logged: {formatDate(job.created_at)}
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
        </div>
      )}

      {/* EDIT JOB MODAL */}
      {editingJob && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Edit Job #{editingJob.shopNum}</h3>
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
                type="tel"
                inputMode="tel"
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
                inputMode="numeric"
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

      {/* EDIT RATE MODAL (ADMIN) */}
      {editingRateProfile && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Edit Custom Rate for {editingRateProfile.email}</h3>
            <form onSubmit={updateMonthlyRate} style={styles.formGrid}>
              <label style={styles.label}>Monthly Rate (LKR)</label>
              <input
                type="number"
                value={editingRateProfile.monthly_rate || 2000}
                onChange={(e) =>
                  setEditingRateProfile({ ...editingRateProfile, monthly_rate: e.target.value })
                }
                style={styles.input}
                required
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={styles.btnPrimary}>
                  Update Rate
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRateProfile(null)}
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
  warningBanner: {
    backgroundColor: '#fef08a',
    color: '#854d0e',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #fde047',
  },
  btnBannerPay: {
    backgroundColor: '#854d0e',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px',
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
    padding: '6px 10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px',
  },
  btnExport: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px',
  },
  btnAdmin: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '12px',
  },
  btnAdminActive: {
    backgroundColor: '#ffffff',
    color: '#2563eb',
    border: 'none',
    padding: '6px 10px',
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
  adminShopCard: {
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '12px',
    backgroundColor: '#f8fafc',
  },
  adminActionsRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    marginTop: '10px',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '8px',
  },
  btnQuickAdd: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnEditRate: {
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnToggleStatus: {
    backgroundColor: '#64748b',
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnDeleteShop: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginLeft: 'auto',
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
    marginBottom: '8px',
  },
  jobText: {
    margin: 0,
    fontSize: '13px',
    color: '#334155',
  },
  dateLabel: {
    fontSize: '11px',
    color: '#64748b',
    marginBottom: '8px',
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
  btnWhatsAppLarge: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    padding: '14px',
    borderRadius: '10px',
    fontWeight: 'bold',
    width: '100%',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  bankBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '14px',
    textAlign: 'left',
    marginBottom: '12px',
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