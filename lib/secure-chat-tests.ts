/**
 * Test suite for secure chat implementation
 * Validates encryption, file upload, message expiration, and backup functionality
 */

import { ChatEncryption, KeyManager } from '@/lib/encryption'
import { SecureFileUpload } from '@/lib/secure-file-upload'
import { MessageExpirationService } from '@/lib/message-expiration'

// Mock data for testing
const mockMessage = "Esta é uma mensagem de teste confidencial para o sistema de saúde mental."
const mockFile = new File(['test file content'], 'test.pdf', { type: 'application/pdf' })

export class SecureChatTests {
  /**
   * Test encryption and decryption functionality
   */
  static async testEncryption(): Promise<boolean> {
    try {
      console.log('🔐 Testing encryption...')
      
      // Generate key
      const key = await ChatEncryption.generateKey()
      console.log('✅ Key generated successfully')
      
      // Export and import key
      const exportedKey = await ChatEncryption.exportKey(key)
      const importedKey = await ChatEncryption.importKey(exportedKey)
      console.log('✅ Key export/import successful')
      
      // Encrypt message
      const encrypted = await ChatEncryption.encryptMessage(mockMessage, key)
      console.log('✅ Message encrypted:', {
        algorithm: encrypted.algorithm,
        version: encrypted.version,
        contentLength: encrypted.content.length
      })
      
      // Decrypt message
      const decrypted = await ChatEncryption.decryptMessage(encrypted, importedKey)
      console.log('✅ Message decrypted successfully')
      
      // Verify integrity
      if (decrypted !== mockMessage) {
        throw new Error('Decrypted message does not match original')
      }
      console.log('✅ Message integrity verified')
      
      return true
    } catch (error) {
      console.error('❌ Encryption test failed:', error)
      return false
    }
  }

  /**
   * Test file validation and security checks
   */
  static async testFileValidation(): Promise<boolean> {
    try {
      console.log('📁 Testing file validation...')
      
      // Test valid file
      const validation = SecureFileUpload.validateFile(mockFile)
      if (!validation.isValid) {
        throw new Error('Valid file rejected')
      }
      console.log('✅ Valid file accepted')
      
      // Test invalid file type
      const invalidFile = new File(['malicious content'], 'malware.exe', { type: 'application/x-executable' })
      const invalidValidation = SecureFileUpload.validateFile(invalidFile)
      if (invalidValidation.isValid) {
        throw new Error('Invalid file type accepted')
      }
      console.log('✅ Invalid file type rejected')
      
      // Test virus scanning
      const fileBuffer = await mockFile.arrayBuffer()
      const scanResult = await SecureFileUpload.scanFile(fileBuffer)
      console.log('✅ Virus scan completed:', scanResult.status)
      
      // Test file name generation
      const secureFileName = SecureFileUpload.generateSecureFileName(mockFile.name, 123)
      console.log('✅ Secure filename generated:', secureFileName)
      
      return true
    } catch (error) {
      console.error('❌ File validation test failed:', error)
      return false
    }
  }

  /**
   * Test message expiration functionality
   */
  static async testMessageExpiration(): Promise<boolean> {
    try {
      console.log('⏰ Testing message expiration...')
      
      // Test expiration options
      const options = MessageExpirationService.EXPIRATION_OPTIONS
      console.log('✅ Expiration options available:', Object.keys(options))
      
      // Test expiration status calculation
      const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
      const expiredDate = new Date(Date.now() - 3600000) // 1 hour ago
      
      const futureStatus = MessageExpirationService.getExpirationStatus(futureDate)
      const expiredStatus = MessageExpirationService.getExpirationStatus(expiredDate)
      
      if (futureStatus.isExpired) {
        throw new Error('Future date marked as expired')
      }
      if (!expiredStatus.isExpired) {
        throw new Error('Past date not marked as expired')
      }
      
      console.log('✅ Expiration status calculation working')
      console.log('  Future message time remaining:', futureStatus.timeRemainingText)
      console.log('  Expired message status:', expiredStatus.timeRemainingText)
      
      return true
    } catch (error) {
      console.error('❌ Message expiration test failed:', error)
      return false
    }
  }

  /**
   * Test key management functionality
   */
  static async testKeyManagement(): Promise<boolean> {
    try {
      console.log('🔑 Testing key management...')
      
      // Generate and store room key
      const roomId = 'test-room-123'
      const key = await ChatEncryption.generateKey()
      await KeyManager.setRoomKey(roomId, key)
      console.log('✅ Room key stored')
      
      // Retrieve room key
      const retrievedKey = await KeyManager.getRoomKey(roomId)
      if (!retrievedKey) {
        throw new Error('Failed to retrieve room key')
      }
      console.log('✅ Room key retrieved')
      
      // Test user key pair generation
      const keyPair = await KeyManager.getUserKeyPair()
      console.log('✅ User key pair generated')
      
      // Test key exchange simulation
      const publicKey = await ChatEncryption.exportPublicKey(keyPair.publicKey)
      const importedPublicKey = await ChatEncryption.importPublicKey(publicKey)
      console.log('✅ Key exchange simulation successful')
      
      return true
    } catch (error) {
      console.error('❌ Key management test failed:', error)
      return false
    }
  }

  /**
   * Test searchable hash creation
   */
  static async testSearchHashing(): Promise<boolean> {
    try {
      console.log('🔍 Testing search hashing...')
      
      const searchTerm = "ansiedade"
      const hash1 = await ChatEncryption.createSearchHash(searchTerm)
      const hash2 = await ChatEncryption.createSearchHash(searchTerm.toUpperCase())
      const hash3 = await ChatEncryption.createSearchHash("depressao")
      
      // Same content should produce same hash
      if (hash1 !== hash2) {
        throw new Error('Case-insensitive search hashing failed')
      }
      
      // Different content should produce different hash
      if (hash1 === hash3) {
        throw new Error('Different content produced same hash')
      }
      
      console.log('✅ Search hashing working correctly')
      console.log('  Hash for "ansiedade":', hash1.substring(0, 20) + '...')
      
      return true
    } catch (error) {
      console.error('❌ Search hashing test failed:', error)
      return false
    }
  }

  /**
   * Test file encryption and decryption
   */
  static async testFileEncryption(): Promise<boolean> {
    try {
      console.log('🔒 Testing file encryption...')
      
      // Generate key for file encryption
      const key = await ChatEncryption.generateKey()
      
      // Create test file buffer
      const fileContent = new TextEncoder().encode("Este é o conteúdo de um arquivo de teste")
      
      // Encrypt file
      const encryptedFile = await ChatEncryption.encryptFile(fileContent.buffer, key)
      console.log('✅ File encrypted successfully')
      
      // Decrypt file
      const decryptedBuffer = await ChatEncryption.decryptFile(encryptedFile, key)
      const decryptedContent = new TextDecoder().decode(decryptedBuffer)
      
      // Verify integrity
      const originalContent = new TextDecoder().decode(fileContent)
      if (decryptedContent !== originalContent) {
        throw new Error('Decrypted file content does not match original')
      }
      
      console.log('✅ File encryption/decryption verified')
      
      return true
    } catch (error) {
      console.error('❌ File encryption test failed:', error)
      return false
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🚀 Starting Secure Chat Tests...\n')
    
    const tests = [
      { name: 'Encryption/Decryption', test: this.testEncryption },
      { name: 'File Validation', test: this.testFileValidation },
      { name: 'Message Expiration', test: this.testMessageExpiration },
      { name: 'Key Management', test: this.testKeyManagement },
      { name: 'Search Hashing', test: this.testSearchHashing },
      { name: 'File Encryption', test: this.testFileEncryption }
    ]
    
    const results = []
    
    for (const { name, test } of tests) {
      console.log(`\n--- Testing ${name} ---`)
      const result = await test()
      results.push({ name, passed: result })
      console.log(`${result ? '✅' : '❌'} ${name}: ${result ? 'PASSED' : 'FAILED'}`)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('TEST SUMMARY')
    console.log('='.repeat(50))
    
    const passed = results.filter(r => r.passed).length
    const total = results.length
    
    results.forEach(({ name, passed }) => {
      console.log(`${passed ? '✅' : '❌'} ${name}`)
    })
    
    console.log(`\nTotal: ${passed}/${total} tests passed`)
    
    if (passed === total) {
      console.log('🎉 All tests passed! Secure chat implementation is ready.')
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.')
    }
  }
}

// Test runner for development
if (typeof window !== 'undefined') {
  // Browser environment - add to global for manual testing
  ;(window as any).SecureChatTests = SecureChatTests
}

// Export for Node.js testing
export default SecureChatTests