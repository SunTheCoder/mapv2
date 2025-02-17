'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { setUser, setError, setLoading } from '../../store/slices/authSlice'
import { supabase } from '../../../lib/supabase'

export default function SignIn() {
  const dispatch = useAppDispatch()
  const { error } = useAppSelector(state => state.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    dispatch(setLoading(true))
    dispatch(setError(null))

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      })

      if (error) throw error
      dispatch(setUser(data.user))
    } catch (error) {
      console.error('Sign in error:', error)
      dispatch(setError(error.message))
    } finally {
      setIsLoading(false)
      dispatch(setLoading(false))
    }
  }

  return (
    <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Sign In</h2>
      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-900"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-900"
            required
          />
        </div>
        {error && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-100 p-2">{error}</div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-black text-white py-2 px-4 hover:bg-black/90 disabled:opacity-50 transition-colors duration-200"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
} 