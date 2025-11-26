"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Shield, Download, Trash2, Eye, Clock, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "react-hot-toast"
import { useTranslations } from "@/lib/i18n"

interface PrivacySettings {
  dataProcessingConsent: boolean
  marketingConsent: boolean
  analyticsConsent: boolean
  shareDataWithPsychologist: boolean
  allowDataExport: boolean
  anonymizeAfterDeletion: boolean
  dataRetentionPreference: number
  notificationPreferences: {
    email: boolean
    sms: boolean
    push: boolean
    complianceUpdates: boolean
  }
}

interface ConsentRecord {
  id: number
  consentType: string
  consentGiven: boolean
  consentDate: string
  purpose: string
  legalBasis: string
  version: string
}

interface DataExport {
  id: number
  requestedAt: string
  completedAt?: string
  format: string
  status: string
  downloadCount: number
}

export default function PrivacyPage() {
  const t = useTranslations("privacy")
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [exports, setExports] = useState<DataExport[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAIConsentAlert, setShowAIConsentAlert] = useState(false)

  useEffect(() => {
    // Check if user was redirected here for AI consent
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('consent') === 'ai_analysis') {
        setShowAIConsentAlert(true)
        // Scroll to AI consent toggle after data loads
        setTimeout(() => {
          const aiConsentElement = document.getElementById('ai-consent-toggle')
          if (aiConsentElement) {
            aiConsentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 500)
      }
    }
    loadPrivacyData()
  }, [])

  const loadPrivacyData = async () => {
    try {
      const [settingsRes, consentsRes, exportsRes] = await Promise.all([
        fetch('/api/compliance/privacy-settings'),
        fetch('/api/compliance/consents'),
        fetch('/api/compliance/data-export')
      ])

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData.data)
      }

      if (consentsRes.ok) {
        const consentsData = await consentsRes.json()
        setConsents(consentsData.data.currentConsents || [])
      }

      if (exportsRes.ok) {
        const exportsData = await exportsRes.json()
        setExports(exportsData.data || [])
      }
    } catch (error) {
      console.error('Error loading privacy data:', error)
      toast.error(t("toast.loadError"))
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<PrivacySettings>) => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/compliance/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setSettings({ ...settings, ...updates })
        toast.success(t("toast.updateSuccess"))
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error(t("toast.updateError"))
    } finally {
      setSaving(false)
    }
  }

  const recordConsent = async (consentType: string, consentGiven: boolean, purpose: string) => {
    try {
      const response = await fetch('/api/compliance/consents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentType,
          consentGiven,
          purpose,
          legalBasis: 'consent'
        })
      })

      if (response.ok) {
        toast.success(consentGiven ? t("toast.consentGranted") : t("toast.consentRevoked"))
        loadPrivacyData()
      } else {
        throw new Error('Failed to record consent')
      }
    } catch (error) {
      console.error('Error recording consent:', error)
      toast.error(t("toast.consentError"))
    }
  }

  const requestDataExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/compliance/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      })

      if (response.ok) {
        toast.success(t("toast.exportRequested"))
        loadPrivacyData()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to request export')
      }
    } catch (error) {
      console.error('Error requesting export:', error)
      toast.error(error instanceof Error ? error.message : t("toast.exportError"))
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">{t("loading")}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t("loadError")}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-gray-600">{t("subtitle")}</p>
        </div>
      </div>

      {showAIConsentAlert && (
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>{t("aiConsentAlert.title")}</strong> {t("aiConsentAlert.message")}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">{t("tabs.settings")}</TabsTrigger>
          <TabsTrigger value="consents">{t("tabs.consents")}</TabsTrigger>
          <TabsTrigger value="exports">{t("tabs.exports")}</TabsTrigger>
          <TabsTrigger value="deletion">{t("tabs.deletion")}</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("settings.title")}</CardTitle>
              <CardDescription>
                {t("settings.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.dataProcessing.label")}</Label>
                      <p className="text-sm text-gray-600">
                        {t("settings.dataProcessing.description")}
                      </p>
                    </div>
                    <Switch
                      checked={settings.dataProcessingConsent}
                      onCheckedChange={(checked) => {
                        updateSettings({ dataProcessingConsent: checked })
                        recordConsent('data_processing', checked, 'Basic platform operation')
                      }}
                      disabled={saving}
                    />
                  </div>

                  <div id="ai-consent-toggle" className="flex items-center justify-between border-l-4 border-blue-500 pl-4 bg-blue-50/30 p-3 rounded">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        {t("settings.aiAnalysis.label")}
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t("settings.aiAnalysis.badge")}</span>
                      </Label>
                      <p className="text-sm text-gray-600">
                        {t("settings.aiAnalysis.description")}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t("settings.aiAnalysis.requiredFor")}
                      </p>
                    </div>
                    <Switch
                      checked={consents.some(c => c.consentType === 'ai_analysis' && c.consentGiven)}
                      onCheckedChange={(checked) => {
                        recordConsent('ai_analysis', checked, 'AI data processing for therapeutic analysis')
                        setShowAIConsentAlert(false)
                      }}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.marketing.label")}</Label>
                      <p className="text-sm text-gray-600">
                        {t("settings.marketing.description")}
                      </p>
                    </div>
                    <Switch
                      checked={settings.marketingConsent}
                      onCheckedChange={(checked) => {
                        updateSettings({ marketingConsent: checked })
                        recordConsent('marketing', checked, 'Marketing communications')
                      }}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.analytics.label")}</Label>
                      <p className="text-sm text-gray-600">
                        {t("settings.analytics.description")}
                      </p>
                    </div>
                    <Switch
                      checked={settings.analyticsConsent}
                      onCheckedChange={(checked) => {
                        updateSettings({ analyticsConsent: checked })
                        recordConsent('analytics', checked, 'Platform usage analysis')
                      }}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.shareWithPsychologist.label")}</Label>
                      <p className="text-sm text-gray-600">
                        {t("settings.shareWithPsychologist.description")}
                      </p>
                    </div>
                    <Switch
                      checked={settings.shareDataWithPsychologist}
                      onCheckedChange={(checked) => updateSettings({ shareDataWithPsychologist: checked })}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.allowExport.label")}</Label>
                      <p className="text-sm text-gray-600">
                        {t("settings.allowExport.description")}
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowDataExport}
                      onCheckedChange={(checked) => updateSettings({ allowDataExport: checked })}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("settings.anonymizeAfterDeletion.label")}</Label>
                      <p className="text-sm text-gray-600">
                        {t("settings.anonymizeAfterDeletion.description")}
                      </p>
                    </div>
                    <Switch
                      checked={settings.anonymizeAfterDeletion}
                      onCheckedChange={(checked) => updateSettings({ anonymizeAfterDeletion: checked })}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>{t("settings.dataRetention.label")}</Label>
                <Select
                  value={settings.dataRetentionPreference.toString()}
                  onValueChange={(value) => updateSettings({ dataRetentionPreference: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="365">{t("settings.dataRetention.years.1")}</SelectItem>
                    <SelectItem value="1095">{t("settings.dataRetention.years.3")}</SelectItem>
                    <SelectItem value="1825">{t("settings.dataRetention.years.5")}</SelectItem>
                    <SelectItem value="2555">{t("settings.dataRetention.years.7")}</SelectItem>
                    <SelectItem value="3650">{t("settings.dataRetention.years.10")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("consents.title")}</CardTitle>
              <CardDescription>
                {t("consents.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">{t("consents.noConsents")}</p>
              ) : (
                <div className="space-y-4">
                  {consents.map((consent) => (
                    <div key={consent.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{consent.consentType}</h4>
                        <p className="text-sm text-gray-600">{consent.purpose}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(consent.consentDate).toLocaleDateString('pt-BR')} - v{consent.version}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {consent.consentGiven ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                        <span className={`text-sm ${consent.consentGiven ? 'text-green-600' : 'text-red-600'}`}>
                          {consent.consentGiven ? t("consents.granted") : t("consents.revoked")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("exports.title")}</CardTitle>
              <CardDescription>
                {t("exports.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Button
                  onClick={() => requestDataExport('json')}
                  disabled={!settings.allowDataExport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t("exports.exportJson")}
                </Button>
                <Button
                  onClick={() => requestDataExport('csv')}
                  disabled={!settings.allowDataExport}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t("exports.exportCsv")}
                </Button>
              </div>

              {!settings.allowDataExport && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t("exports.exportDisabled")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <h4 className="font-medium">{t("exports.requestsTitle")}</h4>
                {exports.length === 0 ? (
                  <p className="text-gray-600">{t("exports.noExports")}</p>
                ) : (
                  <div className="space-y-2">
                    {exports.map((exportRecord) => (
                      <div key={exportRecord.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{exportRecord.format.toUpperCase()}</p>
                          <p className="text-sm text-gray-600">
                            {t("exports.requestedOn")} {new Date(exportRecord.requestedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            exportRecord.status === 'completed' ? 'bg-green-100 text-green-800' :
                            exportRecord.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            exportRecord.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {exportRecord.status}
                          </span>
                          {exportRecord.status === 'completed' && (
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deletion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                {t("deletion.title")}
              </CardTitle>
              <CardDescription>
                {t("deletion.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t("deletion.warning.title")}</strong> {t("deletion.warning.message")}
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">{t("deletion.anonymization.title")}</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {t("deletion.anonymization.description")}
                  </p>
                  <Button variant="outline" className="text-orange-600 hover:text-orange-700">
                    {t("deletion.anonymization.button")}
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">{t("deletion.complete.title")}</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {t("deletion.complete.description")}
                  </p>
                  <Button variant="destructive">
                    {t("deletion.complete.button")}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">{t("deletion.importantInfo.title")}</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• {t("deletion.importantInfo.item1")}</li>
                  <li>• {t("deletion.importantInfo.item2")}</li>
                  <li>• {t("deletion.importantInfo.item3")}</li>
                  <li>• {t("deletion.importantInfo.item4")}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}