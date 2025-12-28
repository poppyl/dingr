'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DevLoginPage() {
  const [status, setStatus] = useState('Logging you in...')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function autoLogin() {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'app@test.com',
        password: 'Testing!'
      })
      
      if (error) {
        setStatus(`Login failed: ${error.message}`)
        return
      }
      
      if (data.user) {
        router.push('/dashboard')
      }
    }
    autoLogin()
  }, [])

  return <div className="p-8 text-lg">{status}</div>
}