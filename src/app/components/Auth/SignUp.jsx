'use client'

import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { setUser, setError, setLoading } from '@/app/store/slices/authSlice'
import { supabase } from '@/lib/supabase'

export default function SignUp() {
  const dispatch = useAppDispatch()
  const { error } = useAppSelector(state => state.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signUpStatus, setSignUpStatus] = useState('')

  const handleSignUp = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      dispatch(setError('Passwords do not match'))
      return
    }

    setIsLoading(true)
    dispatch(setLoading(true))
    setSignUpStatus('Creating account...')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim()
      })

      if (error) throw error

      if (data.user && data.user.identities?.length === 0) {
        setSignUpStatus('Email already registered. Please sign in.')
        return
      }

      dispatch(setUser(data.user))
      setSignUpStatus('Check your email for the confirmation link.')
    } catch (error) {
      console.error('Sign up error:', error)
      dispatch(setError(error.message))
    } finally {
      setIsLoading(false)
      dispatch(setLoading(false))
    }
  }

  return (
    <div className="w-full max-w-sm bg-white/80 backdrop-blur-sm border border-gray-100 p-6">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Sign Up</h2>
      <form onSubmit={handleSignUp} className="space-y-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all duration-200 text-gray-900"
            required
          />
        </div>
        {error && (
          <div className="text-red-500 text-sm bg-red-50 border border-red-100 p-2">{error}</div>
        )}
        {signUpStatus && (
          <div className="text-blue-500 text-sm bg-blue-50 border border-blue-100 p-2">{signUpStatus}</div>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-black text-white py-2 px-4 hover:bg-black/90 disabled:opacity-50 transition-colors duration-200"
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  )
} 