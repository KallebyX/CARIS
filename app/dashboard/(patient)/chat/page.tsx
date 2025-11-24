"use client"

import { useState, useEffect } from "react"
import { SecureChatLayout } from "@/components/chat/chat-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { useTranslations } from "@/lib/i18n"

interface ChatInfo {
  counterpartId: number
  counterpartName: string
}

interface User {
  id: number
  role: "psychologist" | "patient"
}

export default function PatientChatPage() {
  const t = useTranslations('patient.chat')
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [chatInfoRes, userRes] = await Promise.all([fetch("/api/patient/chat-info"), fetch("/api/users/me")])

        if (!chatInfoRes.ok) {
          const errorData = await chatInfoRes.json()
          throw new Error(errorData.error || t('loadError'))
        }
        const chatInfoData = await chatInfoRes.json()
        setChatInfo(chatInfoData)

        if (!userRes.ok) {
          throw new Error(t('userLoadError'))
        }
        const userData = await userRes.json()
        setCurrentUser(userData)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[70vh] w-full" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">{error}</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">{t('title')}</h1>
      <p className="text-slate-600 mb-6">{t('subtitle')}</p>
      {chatInfo && currentUser && (
        <SecureChatLayout
          counterpartId={chatInfo.counterpartId}
          counterpartName={chatInfo.counterpartName}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
