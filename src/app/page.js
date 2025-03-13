'use client'

import { useState } from 'react'
import { useAppSelector } from './store/hooks'
import SignIn from './components/Auth/SignIn'
import SignUp from './components/Auth/SignUp'

export default function Home() {
  const { user } = useAppSelector(state => state.auth)
  const [isSignIn, setIsSignIn] = useState(true)

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-[600px] flex flex-col items-center gap-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">CEC Interactive Map Demo</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              A demonstration of interactive mapping capabilities for the CEC website.
            </p>
          </div>

          <div className="w-full max-w-sm">
            <div className="flex gap-4 items-center flex-col sm:flex-row">
              <a
                className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
                href="/map"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="dark:invert"
                >
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                  <line x1="8" y1="2" x2="8" y2="18"></line>
                  <line x1="16" y1="6" x2="16" y2="22"></line>
                </svg>
                View Map Demo
              </a>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-8 flex gap-6 flex-wrap items-center justify-center text-sm text-gray-600 dark:text-gray-400">
        <p>Built with Next.js, React, and Mapbox</p>
        <a
          className="hover:underline hover:underline-offset-4"
          href="https://www.linkedin.com/in/sunthecoder/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Created by Sun English Jr.
        </a>
      </footer>
    </div>
  )
}
