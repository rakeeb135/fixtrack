import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const MASTER_ADMIN_EMAIL = 'rakeebroomy@gmail.com'
const YOUR_WHATSAPP_NUMBER = '94769944414'

export default function App() {
  const urlParams = new URLSearchParams(window.location.search)
  const trackingJobId = urlParams.get('track')

  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Auth Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')

  // Dashboard State
  const [repairs, setRepairs] = useState([])
  const [trackedJob, setTrackedJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMenuId, setActiveMenuId] = useState(null)
  const [editingJob, setEditingJob] = useState(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showRevenueHistoryModal, setShowRevenueHistoryModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Shop Settings State
  const [shopNameInput, setShopNameInput] = useState('')
  const [googleReviewInput, setGoogleReviewInput] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Admin Dashboard State
  const [allProfiles, setAllProfiles] = useState([])
  const [newShopEmail, setNewShopEmail] = useState('')
  const [newShopPassword, setNewShopPassword] = useState('FixTrack@123')
  const [newShopPhone, setNewShopPhone] = useState('')
  const [newShopRate, setNewShopRate] = useState('2000')
  const [newShopPlan, setNewShopPlan] = useState('trial')
  const [newShopName, setNewShopName] = useState('')
  const [lastOnboardedShop, setLastOnboardedShop] = useState(null)

  const [editingRateProfile, setEditingRateProfile] = useState(null)
  const [customRateInput, setCustomRateInput] = useState('')
  const [editingDateProfile, setEditingDateProfile] = useState(null)
  const [customDateInput, setCustomDateInput] = useState('')

  // New Job Form State
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [issue, setIssue] = useState('')
  const [notes, setNotes] = useState('')
  const [cost, setCost] = useState('')

  const DEFAULT_FAULTS = ['Display', 'Battery', 'Charging', 'No Power', 'Speaker']

  function appendFaultTag(tag) {
    if (!issue) {
      setIssue(tag)
    } else {
      const existing = issue.split(',').map((s) => s.trim())
      if (!existing.includes(tag)) {
        setIssue(`${issue}, ${tag}`)
      }
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user)
      } else {
        setAuthLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session) {
        await fetchUserProfile(session.user)
      } else {
        setProfile(null)
        setAuthLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(user) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (data) {
        setProfile(data)
        setShopNameInput(data.shop_name || 'FixTrack')
        setGoogleReviewInput(data.google_review_url || '')
      } else {
        const isAdmin = user.email === MASTER_ADMIN_EMAIL
        const fallbackProfile = {
          id: user.id,
          email: user.email,
          role: isAdmin ? 'admin' : 'shop',
          status: 'active',
          shop_name: 'FixTrack',
          google_review_url: '',
          monthly_rate: 2000,
          expiry_date: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        }
        setProfile(fallbackProfile)
        setShopNameInput('FixTrack')
        setGoogleReviewInput('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAuthLoading(false)
    }
  }

  useEffect(() => {
    if (trackingJobId) {
      fetchTrackedJob(trackingJobId)
    } else if (session) {
      fetchRepairs()
    }
  }, [session, trackingJobId])

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchAllProfiles()
    }
  }, [profile])

  async function fetchTrackedJob(jobId) {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_tracked_job', { job_id: parseInt(jobId) })
    if (!error && data && data.length > 0) {
      setTrackedJob(data[0])
    }
    setLoading(false)
  }

  async function fetchRepairs() {
    setLoading(true)
    const { data } = await supabase
      .from('repairs')
      .select('*')
      .order('id', { ascending: true })

    setRepairs(data || [])
    setLoading(false)
  }

  async function fetchAllProfiles() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    setAllProfiles(data || [])
  }

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

  function formatDateOnly(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    return d.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  function formatDisplayPhone(phone) {
    if (!phone) return ''
    if (phone.startsWith('94') && phone.length === 11) {
      return '0' + phone.slice(2)
    }
    return phone
  }

  function formatCostDisplay(costVal) {
    const parsed = parseInt(costVal, 10)
    if (!parsed || parsed <= 0) return 'Pending Estimate'
    return `LKR ${parsed.toLocaleString()}`
  }

  function getDaysRemaining() {
    if (!profile?.expiry_date) return 999
    const diffTime = new Date(profile.expiry_date) - new Date()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const daysLeft = getDaysRemaining()
  const isExpired = profile?.role !== 'admin' && (daysLeft <= 0 || profile?.status === 'suspended')
  const isNearExpiry = profile?.role !== 'admin' && daysLeft > 0 && daysLeft <= 3

  const repairsWithShopNum = repairs.map((job, idx) => ({
    ...job,
    shopNum: idx + 1,
  }))

  const sortedRepairs = [...repairsWithShopNum].reverse()
  const activeJobs = sortedRepairs.filter((j) => j.status !== 'Delivered')
  const completedJobs = sortedRepairs.filter((j) => j.status === 'Delivered')

  const now = new Date()
  const currentMonthDelivered = completedJobs.filter((job) => {
    const jobDate = new Date(job.created_at)
    return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear()
  })
  const monthlyRevenue = currentMonthDelivered.reduce((sum, job) => sum + (job.cost || 0), 0)

  const monthlyRevenueHistory = completedJobs.reduce((acc, job) => {
    if (!job.cost || job.cost <= 0) return acc
    const d = new Date(job.created_at)
    const monthKey = d.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
    acc[monthKey] = (acc[monthKey] || 0) + job.cost
    return acc
  }, {})

  // --- AUTH HANDLERS ---
  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      setAuthError(error.message)
      setAuthLoading(false)
    } else if (data?.user) {
      await fetchUserProfile(data.user)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setRepairs([])
    setProfile(null)
  }

  // --- SHOP SETTINGS HANDLER ---
  async function handleSaveShopSettings(e) {
    e.preventDefault()
    setSettingsSaving(true)
    const cleanShopName = shopNameInput.trim() || 'FixTrack'
    const cleanReviewUrl = googleReviewInput.trim()

    const { error } = await supabase
      .from('profiles')
      .update({
        shop_name: cleanShopName,
        google_review_url: cleanReviewUrl,
      })
      .eq('id', session.user.id)

    setSettingsSaving(false)
    if (error) {
      alert('Error updating settings: ' + error.message)
    } else {
      setProfile((prev) => ({
        ...prev,
        shop_name: cleanShopName,
        google_review_url: cleanReviewUrl,
      }))
      setShowSettingsModal(false)
      alert('Settings saved successfully!')
    }
  }

  // --- ADMIN ACTIONS ---
  async function handleCreateShopAccount(e) {
    e.preventDefault()
    if (!newShopEmail || !newShopPassword) {
      alert('Please fill out email and password.')
      return
    }

    const currentAdminUser = session.user

    let formattedShopPhone = newShopPhone.trim()
    if (formattedShopPhone.startsWith('0')) {
      formattedShopPhone = '94' + formattedShopPhone.slice(1)
    }

    const initialExpiry = newShopPlan === 'trial'
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase.auth.signUp({
      email: newShopEmail,
      password: newShopPassword,
    })

    if (error) {
      alert('Error creating user: ' + error.message)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert([
        {
          id: data.user.id,
          email: newShopEmail,
          phone_number: formattedShopPhone,
          shop_name: newShopName.trim() || 'FixTrack',
          role: 'shop',
          status: newShopPlan === 'trial' ? 'trial' : 'active',
          monthly_rate: parseInt(newShopRate) || 2000,
          expiry_date: initialExpiry,
        },
      ])

      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })

      setLastOnboardedShop({
        email: newShopEmail,
        password: newShopPassword,
        phone: formattedShopPhone,
      })

      alert(`Account created successfully for ${newShopEmail}!`)
      setNewShopEmail('')
      setNewShopPassword('FixTrack@123')
      setNewShopPhone('')
      setNewShopName('')
      fetchUserProfile(currentAdminUser)
      fetchAllProfiles()
    }
  }

  function sendShopWelcomeWhatsApp() {
    if (!lastOnboardedShop) return
    const siteUrl = window.location.origin
    const message = `👋 Welcome to FixTrack!\nWe're excited to help you manage your repair shop smoothly! 🚀\n\n🌐 Portal: ${siteUrl}\n📧 Email: ${lastOnboardedShop.email}\n🔑 Password: ${lastOnboardedShop.password}\n\nTap the link above to log in and start sending live repair tracking links to your customers!\n\nNeed help? Reply to this chat anytime. 😊`
    window.open(`https://wa.me/${lastOnboardedShop.phone}?text=${encodeURIComponent(message)}`, '_blank')
  }

  async function extendSubscription(targetProfile, monthsToAdd) {
    const currentExpiry = new Date(targetProfile.expiry_date || Date.now())
    const now = new Date()

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

  async function saveCustomExpiryDate(e) {
    e.preventDefault()
    if (!customDateInput) return

    const newExpiry = new Date(customDateInput).toISOString()

    const { error } = await supabase
      .from('profiles')
      .update({
        status: 'active',
        expiry_date: newExpiry,
      })
      .eq('id', editingDateProfile.id)

    if (error) alert('Error updating expiry date: ' + error.message)
    else {
      setEditingDateProfile(null)
      fetchAllProfiles()
    }
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
    const parsedRate = parseInt(customRateInput, 10) || 0
    const { error } = await supabase
      .from('profiles')
      .update({ monthly_rate: parsedRate })
      .eq('id', editingRateProfile.id)

    if (error) alert('Error updating rate: ' + error.message)
    else {
      setEditingRateProfile(null)
      fetchAllProfiles()
    }
  }

  async function deleteShopAccount(targetProfile) {
    if (!window.confirm(`⚠️ ARE YOU SURE? Delete ${targetProfile.email} and all data?`))
      return

    const { error } = await supabase.from('profiles').delete().eq('id', targetProfile.id)
    if (error) alert('Error deleting shop: ' + error.message)
    else fetchAllProfiles()
  }

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
      'Notes',
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
      `"${job.notes || ''}"`,
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
    const message = `Hi! I am the owner of ${session?.user?.email}. I have made the bank transfer for my FixTrack subscription renewal (LKR ${rate}/month). Here is my payment receipt:`
    window.open(`https://wa.me/${YOUR_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank')
  }

  // --- PUBLIC TRACKING VIEW ---
  if (trackingJobId) {
    const statusOrder = { 'Received': 1, 'In Progress': 2, 'Ready': 3, 'Delivered': 4 }
    const currentStep = trackedJob ? (statusOrder[trackedJob.status] || 1) : 1
    const displayShopTitle = trackedJob?.shop_name || 'FixTrack'

    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px' }}>{displayShopTitle}</h1>
            <p style={{ margin: '2px 0 0 0', opacity: 0.85, fontSize: '12px' }}>
              Live Repair Status • Powered by FixTrack
            </p>
          </div>
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
                Repair Reference
              </span>
              <h2 style={{ fontSize: '32px', margin: '4px 0 20px 0', color: '#0f172a' }}>
                #{trackedJob.id}
              </h2>

              {/* SATISFYING STEPPER */}
              <div style={styles.satisfyingStepperContainer}>
                <div style={styles.satisfyingTrackBackground}>
                  <div
                    style={{
                      ...styles.satisfyingTrackFill,
                      width:
                        currentStep === 1
                          ? '0%'
                          : currentStep === 2
                          ? '50%'
                          : '100%',
                      background:
                        currentStep === 1
                          ? '#eab308'
                          : currentStep === 2
                          ? 'linear-gradient(90deg, #eab308 0%, #0284c7 100%)'
                          : 'linear-gradient(90deg, #0284c7 0%, #16a34a 100%)',
                    }}
                  />
                </div>

                <div style={styles.satisfyingStepNode}>
                  <div
                    style={
                      currentStep >= 1
                        ? {
                            ...styles.satisfyingCircle,
                            backgroundColor: '#fef3c7',
                            borderColor: '#eab308',
                            boxShadow: '0 0 12px rgba(234, 179, 8, 0.4)',
                          }
                        : styles.satisfyingCircleInactive
                    }
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={currentStep >= 1 ? '#b45309' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                  </div>
                  <span style={currentStep >= 1 ? styles.stepLabelYellow : styles.stepLabelInactive}>
                    Received
                  </span>
                </div>

                <div style={styles.satisfyingStepNode}>
                  <div
                    style={
                      currentStep >= 2
                        ? {
                            ...styles.satisfyingCircle,
                            backgroundColor: '#e0f2fe',
                            borderColor: '#0284c7',
                            boxShadow: '0 0 12px rgba(2, 132, 199, 0.4)',
                          }
                        : styles.satisfyingCircleInactive
                    }
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={currentStep >= 2 ? '#0369a1' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.4a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                    </svg>
                  </div>
                  <span style={currentStep >= 2 ? styles.stepLabelBlue : styles.stepLabelInactive}>
                    In Progress
                  </span>
                </div>

                <div style={styles.satisfyingStepNode}>
                  <div
                    style={
                      currentStep >= 3
                        ? {
                            ...styles.satisfyingCircle,
                            backgroundColor: '#dcfce7',
                            borderColor: '#16a34a',
                            boxShadow: '0 0 12px rgba(22, 163, 74, 0.4)',
                          }
                        : styles.satisfyingCircleInactive
                    }
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={currentStep >= 3 ? '#15803d' : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span style={currentStep >= 3 ? styles.stepLabelGreen : styles.stepLabelInactive}>
                    Ready
                  </span>
                </div>
              </div>

              <div style={getStatusBannerStyle(trackedJob.status)}>
                {trackedJob.status === 'Received' && '📥 Device received and logged at the workshop.'}
                {trackedJob.status === 'In Progress' && '🔧 Technician is actively working on your device.'}
                {trackedJob.status === 'Ready' && '🎉 Repair completed! Your device is ready for pickup.'}
                {trackedJob.status === 'Delivered' && '✅ Device collected and repair job closed.'}
              </div>

              {/* PREMIUM HIGH-CONVERTING GOOGLE REVIEW ACTION CARD */}
              {(currentStep >= 3) && trackedJob.google_review_url && (
                <div style={{ marginBottom: '18px' }}>
                  <a
                    href={trackedJob.google_review_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.googleReviewActionCard}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Official Google "G" Vector Icon */}
                      <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.34 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px', lineHeight: '1.3' }}>
                          Review {displayShopTitle} on Google
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
                          Tap to rate your repair experience ➔
                        </div>
                      </div>
                    </div>
                    <div style={{ color: '#eab308', fontSize: '15px', letterSpacing: '1px', flexShrink: 0 }}>
                      ★★★★★
                    </div>
                  </a>
                </div>
              )}

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
                  <strong>{formatCostDisplay(trackedJob.cost)}</strong>
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

  if (authLoading) {
    return <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: '15px' }}>Loading FixTrack...</div>
  }

  // --- LOGIN SCREEN ---
  if (!session) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={{ margin: 0, fontSize: '22px' }}>FixTrack</h1>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '13px' }}>
            Portal Sign In
          </p>
        </header>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sign In to Account</h2>
          {authError && (
            <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '14px' }}>
              {authError}
            </div>
          )}
          <form onSubmit={handleLogin} style={styles.formGrid}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />

            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ ...styles.input, paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.btnEyeToggle}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.45 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <button type="submit" style={{ ...styles.btnPrimary, marginTop: '10px' }}>
              Log In
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- EXPIRED LOCK SCREEN ---
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
              <strong>Bank:</strong> Commercial Bank (Kandy Branch)
            </p>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>
              <strong>Account Name:</strong> M.T.M Rakeeb
            </p>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>
              <strong>Account No:</strong> 8012055155
            </p>
          </div>

          <button onClick={sendRenewalWhatsApp} style={styles.btnWhatsAppLarge}>
            💬 Send Receipt to Reactivate Workspace
          </button>
        </div>
      </div>
    )
  }

  // --- SHOPKEEPER DASHBOARD FUNCTIONS ---
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
        notes: notes,
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
      setNotes('')
      setCost('')
      fetchRepairs()
    }
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from('repairs')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) fetchRepairs()
  }

  async function deleteRepair(id) {
    if (!window.confirm(`Are you sure you want to permanently delete this job?`))
      return
    const { error } = await supabase.from('repairs').delete().eq('id', id)
    if (!error) {
      setActiveMenuId(null)
      fetchRepairs()
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    const { id, customer_name, phone_number, device_model, issue, notes, cost } = editingJob

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
        notes,
        cost: parseInt(cost) || 0,
      })
      .eq('id', id)

    if (!error) {
      setEditingJob(null)
      fetchRepairs()
    }
  }

  function sendWhatsAppNotification(job) {
    const trackingLink = `${window.location.origin}?track=${job.id}`

    let costString = ''
    if (job.cost && parseInt(job.cost) > 0) {
      costString = `Cost: LKR ${job.cost}.`
    } else {
      costString = `Cost will be estimated after inspection.`
    }

    let message = ''
    if (job.status === 'Ready') {
      message = `Hi ${job.customer_name}! Your ${job.device_model} repair is completed and ready for pickup! ${costString}\n\nTrack status: ${trackingLink}`
    } else if (job.status === 'In Progress') {
      message = `Hi ${job.customer_name}! We are working on your ${job.device_model} (${job.issue || 'Service'}).\n\nTrack progress: ${trackingLink}`
    } else {
      message = `Hi ${job.customer_name}! We received your ${job.device_model} for repair. ${costString}\n\nTrack status live: ${trackingLink}`
    }

    window.open(`https://wa.me/${job.phone_number}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const displayedJobs = (activeTab === 'active' ? activeJobs : completedJobs).filter(
    (job) => {
      const query = searchQuery.toLowerCase()
      return (
        job.customer_name?.toLowerCase().includes(query) ||
        job.phone_number?.includes(query) ||
        job.device_model?.toLowerCase().includes(query) ||
        job.issue?.toLowerCase().includes(query) ||
        job.notes?.toLowerCase().includes(query) ||
        job.status?.toLowerCase().includes(query)
      )
    }
  )

  const currentShopBrandTitle = profile?.shop_name && profile?.shop_name !== 'FixTrack' 
    ? profile.shop_name 
    : 'FixTrack'

  return (
    <div style={styles.container} onClick={() => setActiveMenuId(null)}>
      {/* UNCLUTTERED CRISP HEADER */}
      <header style={styles.header}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h1 style={{ margin: 0, fontSize: '20px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {profile?.role === 'admin' ? 'FixTrack' : currentShopBrandTitle}
          </h1>
          <p style={{ margin: '2px 0 0 0', opacity: 0.85, fontSize: '12px' }}>
            {session.user.email} {profile?.role === 'admin' && '👑 (Master Admin)'}
          </p>
        </div>
        <button onClick={handleLogout} style={styles.btnLogout}>
          Sign Out
        </button>
      </header>

      {/* REFINED WARNING BANNER */}
      {isNearExpiry && (
        <div style={styles.warningBannerCard}>
          <div>
            <strong style={{ fontSize: '14px', display: 'block', color: '#854d0e', marginBottom: '2px' }}>
              ⏳ Plan Expires in {daysLeft} Day{daysLeft > 1 ? 's' : ''} ({formatDateOnly(profile?.expiry_date)})
            </strong>
            <span style={{ fontSize: '12px', color: '#a16207' }}>
              Renewal Rate: <strong>LKR {profile?.monthly_rate || 2000} / month</strong>
            </span>
          </div>
          <button onClick={() => setShowPayModal(true)} style={styles.btnBannerPay}>
            💳 View Renewal Details
          </button>
        </div>
      )}

      {/* --- MASTER ADMIN DASHBOARD VIEW --- */}
      {profile?.role === 'admin' ? (
        <div>
          {/* ONBOARD SHOP */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>➕ Onboard New Shopkeeper</h2>
            <form onSubmit={handleCreateShopAccount} style={styles.formGrid}>
              <input
                type="text"
                placeholder="Shop Brand Name (e.g. Kandy Mobile Care)"
                value={newShopName}
                onChange={(e) => setNewShopName(e.target.value)}
                style={styles.input}
              />
              <input
                type="email"
                placeholder="Shop Login Email (e.g. kandymobiles@shop.com) *"
                value={newShopEmail}
                onChange={(e) => setNewShopEmail(e.target.value)}
                style={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Initial Password *"
                value={newShopPassword}
                onChange={(e) => setNewShopPassword(e.target.value)}
                style={styles.input}
                required
              />
              <input
                type="tel"
                placeholder="Shopkeeper WhatsApp Phone (e.g. 0771234567)"
                value={newShopPhone}
                onChange={(e) => setNewShopPhone(e.target.value)}
                style={styles.input}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
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

            {lastOnboardedShop && lastOnboardedShop.phone && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <button onClick={sendShopWelcomeWhatsApp} style={styles.btnWhatsApp}>
                  💬 Send Welcome WhatsApp to {lastOnboardedShop.email}
                </button>
              </div>
            )}
          </div>

          {/* ALL CLIENT SHOPS */}
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
                        <strong style={{ fontSize: '15px' }}>{p.shop_name || 'FixTrack'}</strong>
                        <div style={{ fontSize: '12px', color: '#475569' }}>{p.email}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          Rate: <strong>LKR {p.monthly_rate || 2000}</strong> / mo
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Expires: <strong>{formatDate(p.expiry_date)}</strong> ({pDiff} days left)
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: p.role === 'admin' ? '#dbeafe' : pExpired ? '#fecdd3' : '#bbf7d0',
                          color: p.role === 'admin' ? '#1e40af' : pExpired ? '#9f1239' : '#166534',
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
                        <button
                          onClick={() => {
                            setEditingDateProfile(p)
                            const currentIso = p.expiry_date ? new Date(p.expiry_date).toISOString().slice(0, 10) : ''
                            setCustomDateInput(currentIso)
                          }}
                          style={styles.btnQuickAdd}
                        >
                          📅 Set Date
                        </button>
                        <button
                          onClick={() => {
                            setEditingRateProfile(p)
                            setCustomRateInput(p.monthly_rate ? p.monthly_rate.toString() : '2000')
                          }}
                          style={styles.btnEditRate}
                        >
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
          {/* MINI BUSINESS STATS BAR */}
          <div style={styles.statsBarGrid}>
            <div style={styles.statCard}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>IN SHOP</span>
              <strong style={{ fontSize: '18px', color: '#2563eb' }}>{activeJobs.length} Jobs</strong>
            </div>
            <div style={styles.statCard}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>DELIVERED</span>
              <strong style={{ fontSize: '18px', color: '#10b981' }}>{currentMonthDelivered.length} Jobs</strong>
            </div>
            <div
              style={{ ...styles.statCard, cursor: 'pointer' }}
              onClick={() => setShowRevenueHistoryModal(true)}
              title="Click to view revenue history for previous months"
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>THIS MONTH</span>
              <strong style={{ fontSize: '16px', color: '#059669' }}>LKR {monthlyRevenue.toLocaleString()}</strong>
            </div>
          </div>

          {/* BALANCED CLEAN TOOLBAR */}
          <div style={styles.toolbarGrid}>
            <button onClick={() => setShowSettingsModal(true)} style={styles.btnToolSecondary}>
              ⚙️ Shop Settings
            </button>
            <button onClick={exportToCSV} style={styles.btnToolPrimary}>
              📥 Export (CSV)
            </button>
          </div>

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

              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Issue / Fault (e.g. Display Replacement)"
                    value={issue}
                    onChange={(e) => setIssue(e.target.value)}
                    style={{ ...styles.input, paddingRight: '30px' }}
                  />
                  {issue && (
                    <button
                      type="button"
                      onClick={() => setIssue('')}
                      style={styles.btnClearInput}
                      title="Clear field"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div style={styles.presetContainer}>
                  {DEFAULT_FAULTS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => appendFaultTag(tag)}
                      style={styles.presetChip}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="Internal Notes (e.g. Password: 1234)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={styles.input}
              />

              <input
                type="number"
                inputMode="numeric"
                placeholder="Cost LKR (Leave blank if pending estimate)"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                style={styles.input}
              />
              <button type="submit" style={styles.btnPrimary}>
                Save Job
              </button>
            </form>
          </div>

          <div style={styles.card}>
            <div style={styles.tabBar}>
              <button
                onClick={() => setActiveTab('active')}
                style={activeTab === 'active' ? styles.tabActiveBlue : styles.tabInactive}
              >
                Active Repairs ({activeJobs.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                style={activeTab === 'completed' ? styles.tabActiveGreen : styles.tabInactive}
              >
                Completed ({completedJobs.length})
              </button>
            </div>

            <input
              type="text"
              placeholder="🔍 Search customer, device, phone, notes..."
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <select
                          value={job.status}
                          onChange={(e) => updateStatus(job.id, e.target.value)}
                          style={{
                            ...getStatusStyle(job.status),
                            paddingRight: '22px',
                          }}
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

                    <div style={styles.jobCardBodyStack}>
                      <p style={styles.jobText}>
                        <span>📱 Device:</span> <strong>{job.device_model}</strong>
                      </p>
                      <p style={styles.jobText}>
                        <span>🔧 Fault:</span> <strong>{job.issue || '-'}</strong>
                      </p>
                      {job.notes && (
                        <p style={{ ...styles.jobText, color: '#64748b' }}>
                          <span>📝 Notes:</span> <em>{job.notes}</em>
                        </p>
                      )}
                      <p style={styles.jobText}>
                        <span>📞 Phone:</span>{' '}
                        <strong>{formatDisplayPhone(job.phone_number)}</strong>
                      </p>
                      <p style={styles.jobText}>
                        <span>💰 Cost:</span> <strong>{formatCostDisplay(job.cost)}</strong>
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

      {/* FOOTER EXPIRY */}
      {profile?.role !== 'admin' && (
        <footer style={styles.pageFooter}>
          FixTrack Workspace • Subscription Expiry: {formatDateOnly(profile?.expiry_date)}
        </footer>
      )}

      {/* SHOP SETTINGS MODAL */}
      {showSettingsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>⚙️ Shop Settings & Branding</h3>
            <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.4', marginBottom: '14px' }}>
              Customize your shop brand and review link shown on customer tracking links:
            </p>
            <form onSubmit={handleSaveShopSettings} style={styles.formGrid}>
              <label style={styles.label}>Shop Name (Shown on customer page)</label>
              <input
                type="text"
                placeholder="e.g. Colombo Care"
                value={shopNameInput}
                onChange={(e) => setShopNameInput(e.target.value)}
                style={styles.input}
                required
              />

              <label style={styles.label}>Google Maps Review Link (Optional)</label>
              <input
                type="url"
                placeholder="https://maps.app.goo.gl/..."
                value={googleReviewInput}
                onChange={(e) => setGoogleReviewInput(e.target.value)}
                style={styles.input}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '-4px' }}>
                When repairs reach <strong>Ready</strong> or <strong>Delivered</strong>, an official Google Review action card invites customers to rate your shop.
              </span>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="submit" style={styles.btnPrimary} disabled={settingsSaving}>
                  {settingsSaving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  style={styles.btnCancel}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVENUE HISTORY MODAL */}
      {showRevenueHistoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>📊 Monthly Revenue History</h3>
            <p style={{ color: '#475569', fontSize: '13px', marginBottom: '14px' }}>
              Completed repairs earnings breakdown by month:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {Object.keys(monthlyRevenueHistory).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center' }}>No completed earnings history recorded yet.</p>
              ) : (
                Object.entries(monthlyRevenueHistory).map(([month, rev]) => (
                  <div key={month} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>{month}</span>
                    <strong style={{ color: '#059669', fontSize: '14px' }}>LKR {rev.toLocaleString()}</strong>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setShowRevenueHistoryModal(false)} style={{ ...styles.btnCancel, marginTop: '16px' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* RENEWAL BANK DETAILS MODAL */}
      {showPayModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0, color: '#1e3a8a' }}>💳 FixTrack Renewal Details</h3>
            <p style={{ color: '#475569', fontSize: '13px', lineHeight: '1.4' }}>
              Thank you for partnering with us! Please transfer your subscription payment using the details below:
            </p>

            <div style={styles.bankBox}>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                <strong>Current Rate:</strong> LKR {profile?.monthly_rate || 2000} / month
              </p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                <strong>Expires On:</strong> {formatDateOnly(profile?.expiry_date)}
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid #bfdbfe', margin: '8px 0' }} />
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                <strong>Bank:</strong> Commercial Bank (Kandy Branch)
              </p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                <strong>Account Name:</strong> M.T.M Rakeeb
              </p>
              <p style={{ margin: '4px 0', fontSize: '13px' }}>
                <strong>Account No:</strong> 8012055155
              </p>
            </div>

            <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 12px 0' }}>
              Once transferred, tap below to open WhatsApp and share your payment receipt.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={sendRenewalWhatsApp} style={styles.btnWhatsApp}>
                💬 Send Receipt on WhatsApp (0769944414)
              </button>
              <button onClick={() => setShowPayModal(false)} style={styles.btnCancel}>
                Close
              </button>
            </div>
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

              <label style={styles.label}>Internal Notes</label>
              <input
                type="text"
                value={editingJob.notes || ''}
                onChange={(e) =>
                  setEditingJob({ ...editingJob, notes: e.target.value })
                }
                style={styles.input}
              />

              <label style={styles.label}>Cost (LKR)</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Leave 0 or blank for Pending Estimate"
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

      {/* EDIT EXPIRY DATE MODAL (ADMIN) */}
      {editingDateProfile && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Set Custom Expiry Date for {editingDateProfile.email}</h3>
            <form onSubmit={saveCustomExpiryDate} style={styles.formGrid}>
              <label style={styles.label}>Select Expiry Date</label>
              <input
                type="date"
                value={customDateInput}
                onChange={(e) => setCustomDateInput(e.target.value)}
                style={styles.input}
                required
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={styles.btnPrimary}>
                  Save Expiry Date
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDateProfile(null)}
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
                type="text"
                value={customRateInput}
                onChange={(e) => setCustomRateInput(e.target.value)}
                style={styles.input}
                placeholder="2000"
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

function getStatusBannerStyle(status) {
  let bg = '#fef3c7'
  let color = '#92400e'
  let border = '#fde68a'

  if (status === 'In Progress') {
    bg = '#e0f2fe'
    color = '#075985'
    border = '#bae6fd'
  } else if (status === 'Ready' || status === 'Delivered') {
    bg = '#dcfce7'
    color = '#166534'
    border = '#bbf7d0'
  }

  return {
    backgroundColor: bg,
    color: color,
    border: `1px solid ${border}`,
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '14px',
    lineHeight: '1.4',
  }
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
    marginBottom: '14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  toolbarGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '14px',
  },
  btnToolSecondary: {
    backgroundColor: '#ffffff',
    color: '#334155',
    border: '1px solid #cbd5e1',
    padding: '10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  btnToolPrimary: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  },
  warningBannerCard: {
    backgroundColor: '#fef08a',
    color: '#854d0e',
    padding: '14px 16px',
    borderRadius: '12px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    border: '1px solid #fde047',
  },
  btnBannerPay: {
    backgroundColor: '#854d0e',
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '13px',
    width: '100%',
  },
  statsBarGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1.2fr',
    gap: '8px',
    marginBottom: '10px',
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: '10px',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
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
  presetContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '6px',
  },
  presetChip: {
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnClearInput: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '4px',
  },
  btnEyeToggle: {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '100%',
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
    flexShrink: 0,
  },
  tabBar: {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '8px',
    marginBottom: '12px',
  },
  tabActiveBlue: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tabActiveGreen: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tabInactive: {
    backgroundColor: '#f1f5f9',
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
    padding: '0 4px',
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
  jobCardBodyStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
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
    padding: '11px',
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
  googleReviewActionCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1.5px solid #cbd5e1',
    padding: '12px 14px',
    borderRadius: '12px',
    textDecoration: 'none',
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
    transition: 'all 0.2s ease',
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
  pageFooter: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#94a3b8',
    margin: '20px 0 10px 0',
  },
  satisfyingStepperContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    margin: '24px 12px 20px 12px',
  },
  satisfyingTrackBackground: {
    position: 'absolute',
    top: '18px',
    left: '30px',
    right: '30px',
    height: '4px',
    backgroundColor: '#e2e8f0',
    borderRadius: '2px',
    zIndex: 1,
  },
  satisfyingTrackFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'all 0.4s ease',
  },
  satisfyingStepNode: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 2,
    position: 'relative',
  },
  satisfyingCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    borderWidth: '2px',
    borderStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
    transition: 'all 0.3s ease',
  },
  satisfyingCircleInactive: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  stepLabelYellow: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#b45309',
  },
  stepLabelBlue: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#0369a1',
  },
  stepLabelGreen: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#15803d',
  },
  stepLabelInactive: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8',
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
  if (status === 'Received') { bg = '#fef3c7'; color = '#854d0e'; }
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