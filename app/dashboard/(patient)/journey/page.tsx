"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Brain, Calendar, BarChart3, LifeBuoy } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "@/lib/i18n"

export default function JourneyPage() {
  const t = useTranslations('patient.journey')

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </div>

      {/* SOS Button */}
      <Card className="bg-red-50 border-2 border-red-200 shadow-lg">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-red-800">{t('sosCardTitle')}</h3>
            <p className="text-red-700">{t('sosCardDescription')}</p>
          </div>
          <Button className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto" asChild>
            <Link href="/dashboard/sos">
              <LifeBuoy className="w-5 h-5 mr-2" />
              {t('accessSOS')}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Current Cycle */}
      <Card className="border-2 border-[#2D9B9B]">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t('currentCycle', { cycle: 'Crescer' })}</h3>
          <p className="text-gray-600 mb-4">{t('growthPhase')}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: "65%" }}></div>
          </div>
          <p className="text-sm text-gray-600">{t('completed', { percent: '65' })}</p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/dashboard/diary">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Brain className="w-12 h-12 text-[#2D9B9B] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('emotionalDiary')}</h3>
              <p className="text-gray-600 text-sm">{t('emotionalDiaryDescription')}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sessions">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-[#F4A261] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('nextSession')}</h3>
              <p className="text-gray-600 text-sm">{t('sessionTime')}</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
