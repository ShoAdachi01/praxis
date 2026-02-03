import { useEffect, useState, useMemo } from 'react'
import { Routes, Route, useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useStones } from '@/hooks/useStones'
import { usePartner } from '@/hooks/usePartner'
import { useThoughts } from '@/hooks/useThoughts'
import { AuthGate } from '@/components/AuthGate'
import { Garden } from '@/components/Garden'
import { InviteFlow } from '@/components/InviteFlow'
import { Profile, Stone, Thought } from '@/lib/supabase'

// Theme variants
// ?theme=stone (warm, current default)
// ?theme=moss (cooler minimal)
export type Theme = 'moss' | 'stone'

// Demo mode - bypass Supabase auth for testing
const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your-supabase-url'

const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  email: 'demo@praxis.app',
  display_initial: 'D',
  partner_id: 'demo-partner',
  created_at: new Date().toISOString(),
}

function JoinRoute() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { claimInvite } = usePartner(user?.id)
  const [claimed, setClaimed] = useState(false)

  useEffect(() => {
    if (code) {
      sessionStorage.setItem('pendingInvite', code)
    }
  }, [code])

  useEffect(() => {
    if (user && code && !claimed) {
      claimInvite(code).then(() => {
        setClaimed(true)
        sessionStorage.removeItem('pendingInvite')
        navigate('/', { replace: true })
      })
    }
  }, [user, code, claimed, claimInvite, navigate])

  if (authLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <AuthGate onSignIn={async () => ({ error: null })} />
  }

  return <LoadingScreen />
}

function LoadingScreen() {
  return (
    <div className="h-full flex items-center justify-center grain">
      <motion.div
        className="w-1 h-6 bg-current rounded-full"
        animate={{
          opacity: [0.15, 0.35, 0.15],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  )
}

function MainApp() {
  const [searchParams] = useSearchParams()
  const urlTheme = searchParams.get('theme') as Theme | null

  // Theme state: URL param > localStorage > default 'stone'
  const [theme, setTheme] = useState<Theme>(() => {
    if (urlTheme) return urlTheme
    return (localStorage.getItem('praxis-theme') as Theme) || 'stone'
  })

  // Toggle between moss and stone themes
  const toggleTheme = () => {
    const newTheme = theme === 'moss' ? 'stone' : 'moss'
    setTheme(newTheme)
    localStorage.setItem('praxis-theme', newTheme)
  }

  const { user, profile, loading: authLoading, signInWithEmail, devSignIn } = useAuth()
  const { myStones, partnerStones, placeStone } = useStones(
    user?.id,
    profile?.partner_id ?? null
  )
  const { createInvite, claimInvite } = usePartner(user?.id)

  const [showInviteFlow, setShowInviteFlow] = useState(false)
  const [partnerProfile] = useState<{ display_initial: string } | null>(null)

  // Demo mode - only enabled if Supabase credentials aren't configured
  const demoMode = DEMO_MODE
  const useLocalState = demoMode
  const [localStones, setLocalStones] = useState<Stone[]>([])
  const [localThoughts, setLocalThoughts] = useState<Thought[]>([])

  // Get all stone IDs for thoughts lookup
  const allStoneIds = useMemo(() => {
    if (useLocalState) {
      return [...localStones.map(s => s.id)]
    }
    return [...myStones.map(s => s.id), ...partnerStones.map(s => s.id)]
  }, [useLocalState, localStones, myStones, partnerStones])

  // Thoughts hook
  const { thoughtsByStone: realThoughtsByStone, addThought: realAddThought } = useThoughts(
    allStoneIds,
    user?.id,
    profile?.partner_id ?? null
  )

  // Local thoughts by stone (for demo/dev mode)
  const localThoughtsByStone = useMemo(() => {
    const map = new Map<string, Thought[]>()
    for (const thought of localThoughts) {
      const existing = map.get(thought.stone_id) || []
      map.set(thought.stone_id, [...existing, thought])
    }
    return map
  }, [localThoughts])

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Check for pending invite from join link
  useEffect(() => {
    if (user && !profile?.partner_id) {
      const pendingInvite = sessionStorage.getItem('pendingInvite')
      if (pendingInvite) {
        claimInvite(pendingInvite).then(() => {
          sessionStorage.removeItem('pendingInvite')
        })
      }
    }
  }, [user, profile?.partner_id, claimInvite])

  // Show invite flow for new users without partner
  useEffect(() => {
    if (user && profile && !profile.partner_id) {
      const dismissed = localStorage.getItem(`invite-dismissed-${user.id}`)
      if (!dismissed) {
        setShowInviteFlow(true)
      }
    }
  }, [user, profile])

  const handleSkipInvite = () => {
    if (user) {
      localStorage.setItem(`invite-dismissed-${user.id}`, 'true')
    }
    setShowInviteFlow(false)
  }

  const handleCreateInvite = async () => {
    return createInvite()
  }

  const handleClaimInvite = async (code: string) => {
    const success = await claimInvite(code)
    if (success) {
      setShowInviteFlow(false)
    }
    return success
  }

  const handlePlaceStone = async (text: string) => {
    if (useLocalState) {
      const newStone: Stone = {
        id: Date.now().toString(),
        user_id: user?.id ?? 'demo-user',
        text,
        placed_at: new Date().toISOString(),
      }
      setLocalStones(prev => [newStone, ...prev])
      return { error: null }
    }
    return placeStone(text)
  }

  const handleAddThought = async (stoneId: string, text: string) => {
    if (useLocalState) {
      const newThought: Thought = {
        id: `t${Date.now()}`,
        stone_id: stoneId,
        user_id: user?.id ?? 'demo-user',
        text,
        created_at: new Date().toISOString(),
      }
      setLocalThoughts(prev => [...prev, newThought])
      return { error: null }
    }
    return realAddThought(stoneId, text)
  }

  // Loading state (skip if demo mode or dev user)
  if (!useLocalState && authLoading) {
    return <LoadingScreen />
  }

  // Not authenticated (and not demo mode)
  if (!demoMode && !user) {
    return <AuthGate onSignIn={signInWithEmail} onDevSignIn={devSignIn} />
  }

  // Wait for profile to load after authentication (skip for dev users - profile set instantly)
  if (!useLocalState && user && !profile) {
    return <LoadingScreen />
  }

  // Invite flow for new users without partner (skip in demo/dev mode)
  if (!useLocalState && showInviteFlow && !profile?.partner_id) {
    return (
      <InviteFlow
        onCreateInvite={handleCreateInvite}
        onClaimInvite={handleClaimInvite}
        onSkip={handleSkipInvite}
      />
    )
  }

  // Determine which data to use
  const activeProfile = useLocalState ? (demoMode ? DEMO_PROFILE : profile!) : profile!
  const activeMyStones = useLocalState ? localStones : myStones
  const activePartnerStones = useLocalState ? [] : partnerStones
  const activeThoughtsByStone = useLocalState ? localThoughtsByStone : realThoughtsByStone
  const hasPartner = useLocalState ? !!profile?.partner_id : !!profile?.partner_id

  // Garden component (stone/moss themes)
  return (
    <Garden
      profile={activeProfile}
      myStones={activeMyStones}
      partnerStones={activePartnerStones}
      partnerInitial={partnerProfile?.display_initial}
      onPlaceStone={handlePlaceStone}
      hasPartner={hasPartner}
      theme={theme}
      thoughtsByStone={activeThoughtsByStone}
      onAddThought={handleAddThought}
      onToggleTheme={toggleTheme}
    />
  )
}

export default function App() {
  return (
    <div className="h-full w-full">
      <Routes>
        <Route path="/join/:code" element={<JoinRoute />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </div>
  )
}
