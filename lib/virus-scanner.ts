/**
 * SECURITY: Virus scanning service with multiple backends
 * Supports ClamAV (local) and VirusTotal API (cloud fallback)
 */

import { safeError } from './safe-logger'

export interface ScanResult {
  status: 'clean' | 'infected' | 'pending' | 'error'
  engine: 'clamav' | 'virustotal' | 'heuristic'
  details?: string
  threats?: string[]
  scanDuration?: number
}

export class VirusScanner {
  private static instance: VirusScanner
  private clamavAvailable: boolean = false
  private virusTotalApiKey: string | undefined

  private constructor() {
    this.virusTotalApiKey = process.env.VIRUSTOTAL_API_KEY
    this.initClamAV()
  }

  static getInstance(): VirusScanner {
    if (!VirusScanner.instance) {
      VirusScanner.instance = new VirusScanner()
    }
    return VirusScanner.instance
  }

  /**
   * Check if ClamAV is available
   */
  private async initClamAV() {
    try {
      // Check if clamd is running or clamscan is available
      const { execSync } = require('child_process')
      execSync('which clamscan', { stdio: 'ignore' })
      this.clamavAvailable = true
      console.log('[VIRUS_SCANNER] ClamAV detected and available')
    } catch {
      this.clamavAvailable = false
      console.warn('[VIRUS_SCANNER] ClamAV not available, will use fallback methods')
    }
  }

  /**
   * Scan file using ClamAV (local antivirus engine)
   */
  private async scanWithClamAV(fileBuffer: ArrayBuffer): Promise<ScanResult> {
    const startTime = Date.now()

    try {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)
      const fs = require('fs')
      const path = require('path')
      const os = require('os')

      // Create temporary file for scanning
      const tempDir = os.tmpdir()
      const tempFile = path.join(tempDir, `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

      // Write buffer to temp file
      const buffer = Buffer.from(fileBuffer)
      fs.writeFileSync(tempFile, buffer)

      try {
        // Run ClamAV scan
        // --no-summary: Don't print summary
        // --infected: Only print infected files
        // --remove=no: Don't remove files
        const { stdout, stderr } = await execAsync(`clamscan --no-summary --infected ${tempFile}`)

        // Clean up temp file
        fs.unlinkSync(tempFile)

        const scanDuration = Date.now() - startTime

        // ClamAV returns:
        // - Exit code 0: No virus found
        // - Exit code 1: Virus found
        // - Exit code 2: Error

        if (stdout.includes('FOUND')) {
          // Extract virus name from output
          const match = stdout.match(/:\s+(.+)\s+FOUND/)
          const virusName = match ? match[1] : 'Unknown threat'

          return {
            status: 'infected',
            engine: 'clamav',
            details: `Threat detected by ClamAV: ${virusName}`,
            threats: [virusName],
            scanDuration,
          }
        }

        return {
          status: 'clean',
          engine: 'clamav',
          details: 'No threats detected by ClamAV',
          scanDuration,
        }
      } catch (error: any) {
        // Clean up temp file on error
        try {
          fs.unlinkSync(tempFile)
        } catch {}

        // Check if it's a virus detection (exit code 1)
        if (error.code === 1 && error.stdout && error.stdout.includes('FOUND')) {
          const match = error.stdout.match(/:\s+(.+)\s+FOUND/)
          const virusName = match ? match[1] : 'Unknown threat'

          return {
            status: 'infected',
            engine: 'clamav',
            details: `Threat detected by ClamAV: ${virusName}`,
            threats: [virusName],
            scanDuration: Date.now() - startTime,
          }
        }

        throw error
      }
    } catch (error) {
      safeError('[VIRUS_SCANNER_CLAMAV]', 'ClamAV scan failed:', error)
      return {
        status: 'error',
        engine: 'clamav',
        details: 'ClamAV scan error',
        scanDuration: Date.now() - startTime,
      }
    }
  }

  /**
   * Scan file using VirusTotal API (cloud-based)
   */
  private async scanWithVirusTotal(fileBuffer: ArrayBuffer): Promise<ScanResult> {
    if (!this.virusTotalApiKey) {
      return {
        status: 'error',
        engine: 'virustotal',
        details: 'VirusTotal API key not configured',
      }
    }

    const startTime = Date.now()

    try {
      const FormData = require('form-data')
      const fetch = (await import('node-fetch')).default

      // Convert ArrayBuffer to Buffer
      const buffer = Buffer.from(fileBuffer)

      // Step 1: Upload file for scanning
      const formData = new FormData()
      formData.append('file', buffer, { filename: 'upload' })

      const uploadResponse = await fetch('https://www.virustotal.com/api/v3/files', {
        method: 'POST',
        headers: {
          'x-apikey': this.virusTotalApiKey,
        },
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`VirusTotal upload failed: ${uploadResponse.statusText}`)
      }

      const uploadData: any = await uploadResponse.json()
      const analysisId = uploadData.data.id

      // Step 2: Wait briefly for analysis to complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Step 3: Get analysis results
      const analysisResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: {
          'x-apikey': this.virusTotalApiKey,
        },
      })

      if (!analysisResponse.ok) {
        throw new Error(`VirusTotal analysis failed: ${analysisResponse.statusText}`)
      }

      const analysisData: any = await analysisResponse.json()
      const stats = analysisData.data.attributes.stats
      const results = analysisData.data.attributes.results

      const scanDuration = Date.now() - startTime

      // If any engine detected malicious content
      if (stats.malicious > 0) {
        const threats = Object.entries(results)
          .filter(([_, result]: [string, any]) => result.category === 'malicious')
          .map(([engine, result]: [string, any]) => `${engine}: ${result.result}`)

        return {
          status: 'infected',
          engine: 'virustotal',
          details: `Detected by ${stats.malicious}/${stats.malicious + stats.undetected} engines`,
          threats,
          scanDuration,
        }
      }

      // If analysis is still in progress
      if (analysisData.data.attributes.status === 'queued') {
        return {
          status: 'pending',
          engine: 'virustotal',
          details: 'Scan queued at VirusTotal',
          scanDuration,
        }
      }

      return {
        status: 'clean',
        engine: 'virustotal',
        details: `Scanned by ${stats.harmless + stats.undetected} engines, no threats found`,
        scanDuration,
      }
    } catch (error) {
      safeError('[VIRUS_SCANNER_VIRUSTOTAL]', 'VirusTotal scan failed:', error)
      return {
        status: 'error',
        engine: 'virustotal',
        details: 'VirusTotal scan error',
        scanDuration: Date.now() - startTime,
      }
    }
  }

  /**
   * Heuristic-based scanning (fallback when AV engines unavailable)
   */
  private async scanWithHeuristics(fileBuffer: ArrayBuffer, declaredMimeType: string): Promise<ScanResult> {
    const startTime = Date.now()

    try {
      // Import SecureFileUpload for heuristic checks
      const { SecureFileUpload } = await import('./secure-file-upload')

      // Validate magic bytes
      const magicBytesCheck = SecureFileUpload.validateMagicBytes(fileBuffer, declaredMimeType)
      if (!magicBytesCheck.valid) {
        return {
          status: 'infected',
          engine: 'heuristic',
          details: `File type mismatch: ${magicBytesCheck.error}`,
          scanDuration: Date.now() - startTime,
        }
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        { pattern: new Uint8Array([0x4D, 0x5A]), name: 'PE executable (MZ header)' },
        { pattern: new Uint8Array([0x7F, 0x45, 0x4C, 0x46]), name: 'ELF executable' },
        { pattern: new Uint8Array([0xCE, 0xFA, 0xED, 0xFE]), name: 'Mach-O binary' },
        { pattern: new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE]), name: 'Java class file' },
        { pattern: new Uint8Array([0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]), name: '<script tag' },
        { pattern: new Uint8Array([0x3C, 0x69, 0x66, 0x72, 0x61, 0x6D, 0x65]), name: '<iframe tag' },
      ]

      const fileArray = new Uint8Array(fileBuffer)

      for (const { pattern, name } of suspiciousPatterns) {
        if (this.containsPattern(fileArray, pattern)) {
          return {
            status: 'infected',
            engine: 'heuristic',
            details: `Suspicious pattern detected: ${name}`,
            threats: [name],
            scanDuration: Date.now() - startTime,
          }
        }
      }

      // Check for excessive null bytes (potential obfuscation)
      const nullByteCount = fileArray.filter(byte => byte === 0).length
      if (nullByteCount > fileArray.length * 0.7) {
        return {
          status: 'infected',
          engine: 'heuristic',
          details: 'Excessive null bytes detected (potential obfuscation)',
          scanDuration: Date.now() - startTime,
        }
      }

      // Check for empty files
      if (fileBuffer.byteLength === 0) {
        return {
          status: 'infected',
          engine: 'heuristic',
          details: 'Empty file detected',
          scanDuration: Date.now() - startTime,
        }
      }

      return {
        status: 'clean',
        engine: 'heuristic',
        details: 'No suspicious patterns detected',
        scanDuration: Date.now() - startTime,
      }
    } catch (error) {
      safeError('[VIRUS_SCANNER_HEURISTIC]', 'Heuristic scan failed:', error)
      return {
        status: 'error',
        engine: 'heuristic',
        details: 'Heuristic scan error',
        scanDuration: Date.now() - startTime,
      }
    }
  }

  /**
   * Helper: Check if file contains byte pattern
   */
  private containsPattern(data: Uint8Array, pattern: Uint8Array): boolean {
    for (let i = 0; i <= data.length - pattern.length; i++) {
      let found = true
      for (let j = 0; j < pattern.length; j++) {
        if (data[i + j] !== pattern[j]) {
          found = false
          break
        }
      }
      if (found) return true
    }
    return false
  }

  /**
   * Main scanning method with automatic fallback chain
   * Priority: ClamAV → VirusTotal → Heuristics
   */
  async scanFile(fileBuffer: ArrayBuffer, declaredMimeType: string): Promise<ScanResult> {
    // Try ClamAV first (fastest, local)
    if (this.clamavAvailable) {
      console.log('[VIRUS_SCANNER] Scanning with ClamAV...')
      const result = await this.scanWithClamAV(fileBuffer)

      if (result.status !== 'error') {
        return result
      }

      console.warn('[VIRUS_SCANNER] ClamAV scan failed, trying VirusTotal...')
    }

    // Fallback to VirusTotal (cloud-based, comprehensive)
    if (this.virusTotalApiKey) {
      console.log('[VIRUS_SCANNER] Scanning with VirusTotal API...')
      const result = await this.scanWithVirusTotal(fileBuffer)

      if (result.status !== 'error') {
        return result
      }

      console.warn('[VIRUS_SCANNER] VirusTotal scan failed, using heuristics...')
    }

    // Final fallback to heuristics
    console.log('[VIRUS_SCANNER] Using heuristic scanning...')
    return await this.scanWithHeuristics(fileBuffer, declaredMimeType)
  }

  /**
   * Get scanner status and availability
   */
  getStatus(): {
    clamav: boolean
    virustotal: boolean
    heuristic: boolean
  } {
    return {
      clamav: this.clamavAvailable,
      virustotal: !!this.virusTotalApiKey,
      heuristic: true, // Always available
    }
  }
}
