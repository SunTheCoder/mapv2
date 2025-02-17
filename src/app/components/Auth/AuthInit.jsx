'use client'

import { useEffect } from 'react'
import { useAppDispatch } from '@/app/store/hooks'
import { setUser } from '@/app/store/slices/authSlice'
import { supabase } from '@/lib/supabase'

export function AuthInit({ children }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        dispatch(setUser(session.user))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setUser(session?.user ?? null))
    })

    return () => subscription.unsubscribe()
  }, [dispatch])

  return children
} 