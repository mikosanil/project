import { useState, useEffect, useCallback, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'manager' | 'user'
  department: string | null
  created_at: string
  updated_at: string
}
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const loadingProfileRef = useRef<Set<string>>(new Set())
  const loadedUserIdsRef = useRef<Set<string>>(new Set())
  const lastUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    let mounted = true
    let initialLoadDone = false

      const loadUserProfile = async (userId: string) => {
      // Prevent multiple simultaneous loads for the same user
      if (loadingProfileRef.current.has(userId)) {
        return
      }

      // If we already loaded this user's profile and it's still the current user, skip
      if (loadedUserIdsRef.current.has(userId) && lastUserIdRef.current === userId) {
        return
      }

      try {
        loadingProfileRef.current.add(userId)
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (!mounted) return

        if (error) {
          console.error('Error loading user profile:', error)
          // If user doesn't exist in users table, that's okay - just log it
          if (error.code !== 'PGRST116') {
            throw error
          }
        } else if (data) {
          setUserProfile(data)
          loadedUserIdsRef.current.add(userId)
          lastUserIdRef.current = userId
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      } finally {
        loadingProfileRef.current.delete(userId)
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      
      console.log('useAuth - Initial session:', session)
      setUser(session?.user ?? null)
      if (session?.user) {
        console.log('useAuth - Loading user profile for:', session.user.id)
        lastUserIdRef.current = session.user.id
        loadUserProfile(session.user.id)
      }
      initialLoadDone = true
      setLoading(false)
    })

    // Listen for auth changes - but ignore INITIAL_SESSION and duplicate SIGNED_IN events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      
      // Ignore INITIAL_SESSION - we already handled it with getSession()
      if (event === 'INITIAL_SESSION') {
        return
      }

      // Only process if user actually changed
      const newUserId = session?.user?.id || null
      if (newUserId === lastUserIdRef.current && event === 'SIGNED_IN') {
        console.log('useAuth - Ignoring duplicate SIGNED_IN event for same user')
        return
      }

      console.log('useAuth - Auth state change:', event, session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const userId = session.user.id
        
        // Only load if we haven't loaded this user yet
        if (!loadedUserIdsRef.current.has(userId) || lastUserIdRef.current !== userId) {
          console.log('useAuth - Loading user profile for:', userId)
          lastUserIdRef.current = userId
          loadUserProfile(userId)
        }
      } else {
        setUserProfile(null)
        lastUserIdRef.current = null
        loadedUserIdsRef.current.clear()
      }
      
      if (initialLoadDone) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: ''
        }
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    setUserProfile(null)
    lastUserIdRef.current = null
    loadedUserIdsRef.current.clear()
    return { error }
  }

  const refreshProfile = async () => {
    if (!user?.id) return
    
    // Clear cache for this user to force reload
    loadedUserIdsRef.current.delete(user.id)
    lastUserIdRef.current = null
    
    // Reload profile
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error refreshing user profile:', error)
    } else if (data) {
      setUserProfile(data)
      loadedUserIdsRef.current.add(user.id)
      lastUserIdRef.current = user.id
    }
  }

  return {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: userProfile?.role === 'admin',
    isManager: userProfile?.role === 'manager' || userProfile?.role === 'admin',
    refreshProfile
  }
}