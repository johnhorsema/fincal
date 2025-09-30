// Security monitoring and threat detection
interface SecurityThreat {
  id: string
  type: 'xss' | 'sql_injection' | 'path_traversal' | 'rate_limit' | 'suspicious_activity' | 'csrf' | 'data_exfiltration'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  payload: string
  timestamp: Date
  ip?: string
  userAgent?: string
  userId?: string
  blocked: boolean
  context?: Record<string, any>
}

interface SecurityMetrics {
  totalThreats: number
  threatsToday: number
  blockedIPs: number
  topThreatTypes: Array<{ type: string; count: number }>
  recentThreats: SecurityThreat[]
}

class SecurityMonitor {
  private threats: SecurityThreat[] = []
  private maxThreats = 1000
  private suspiciousIPs = new Map<string, number>()
  private blockedIPs = new Set<string>()
  private alertThresholds = {
    xss: 3,
    sql_injection: 2,
    path_traversal: 5,
    rate_limit: 10,
    suspicious_activity: 5,
    csrf: 3,
    data_exfiltration: 1
  }

  logThreat(threat: Omit<SecurityThreat, 'id' | 'timestamp'>): SecurityThreat {
    const fullThreat: SecurityThreat = {
      ...threat,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }

    this.threats.unshift(fullThreat)
    if (this.threats.length > this.maxThreats) {
      this.threats = this.threats.slice(0, this.maxThreats)
    }

    // Track suspicious IPs
    if (threat.ip) {
      const count = this.suspiciousIPs.get(threat.ip) || 0
      this.suspiciousIPs.set(threat.ip, count + 1)

      // Check if IP should be auto-blocked
      const threshold = this.alertThresholds[threat.type] || 5
      if (count + 1 >= threshold && threat.severity !== 'low') {
        this.blockedIPs.add(threat.ip)
        console.warn(`IP ${threat.ip} has been auto-blocked due to ${threat.type} threats (${count + 1} attempts)`)
        
        // Log the auto-block as a separate threat
        this.logThreat({
          type: 'suspicious_activity',
          severity: 'high',
          description: `IP auto-blocked after ${count + 1} ${threat.type} attempts`,
          payload: `IP: ${threat.ip}`,
          ip: threat.ip,
          userAgent: threat.userAgent,
          blocked: true,
          context: { autoBlock: true, originalThreatType: threat.type }
        })
      }
    }

    // Log to console in development
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.warn('Security threat detected:', fullThreat)
    }

    // In production, send to security monitoring service
    this.sendToSecurityService(fullThreat)

    return fullThreat
  }

  private async sendToSecurityService(threat: SecurityThreat): Promise<void> {
    // In production, send to external security monitoring service
    try {
      // Store in localStorage for now (in production, use proper logging service)
      const stored = localStorage.getItem('security_threats') || '[]'
      const threats = JSON.parse(stored)
      threats.unshift(threat)
      
      // Keep only last 100 threats in localStorage
      const trimmed = threats.slice(0, 100)
      localStorage.setItem('security_threats', JSON.stringify(trimmed))
    } catch (error) {
      console.error('Failed to store security threat:', error)
    }
  }

  isIPBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip)
  }

  getThreats(type?: SecurityThreat['type'], limit = 100): SecurityThreat[] {
    let filtered = this.threats
    if (type) {
      filtered = this.threats.filter(threat => threat.type === type)
    }
    return filtered.slice(0, limit)
  }

  getThreatsByIP(ip: string): SecurityThreat[] {
    return this.threats.filter(threat => threat.ip === ip)
  }

  getThreatsBySeverity(severity: SecurityThreat['severity']): SecurityThreat[] {
    return this.threats.filter(threat => threat.severity === severity)
  }

  getSuspiciousIPs(): Array<{ ip: string; threatCount: number; blocked: boolean; lastThreat: Date }> {
    return Array.from(this.suspiciousIPs.entries()).map(([ip, count]) => {
      const ipThreats = this.getThreatsByIP(ip)
      const lastThreat = ipThreats.length > 0 ? ipThreats[0].timestamp : new Date()
      
      return {
        ip,
        threatCount: count,
        blocked: this.blockedIPs.has(ip),
        lastThreat
      }
    })
  }

  getSecurityMetrics(): SecurityMetrics {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const threatsToday = this.threats.filter(threat => threat.timestamp >= today).length
    
    // Count threats by type
    const threatCounts = new Map<string, number>()
    this.threats.forEach(threat => {
      threatCounts.set(threat.type, (threatCounts.get(threat.type) || 0) + 1)
    })
    
    const topThreatTypes = Array.from(threatCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      totalThreats: this.threats.length,
      threatsToday,
      blockedIPs: this.blockedIPs.size,
      topThreatTypes,
      recentThreats: this.threats.slice(0, 10)
    }
  }

  blockIP(ip: string, reason?: string): void {
    this.blockedIPs.add(ip)
    
    // Log the manual block
    this.logThreat({
      type: 'suspicious_activity',
      severity: 'medium',
      description: `IP manually blocked${reason ? `: ${reason}` : ''}`,
      payload: `IP: ${ip}`,
      ip,
      blocked: true,
      context: { manualBlock: true, reason }
    })
  }

  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip)
    this.suspiciousIPs.delete(ip)
  }

  clearThreats(): void {
    this.threats = []
    this.suspiciousIPs.clear()
    localStorage.removeItem('security_threats')
  }

  // Advanced threat detection methods
  detectAnomalousActivity(ip: string, userAgent?: string): boolean {
    const ipThreats = this.getThreatsByIP(ip)
    
    // Check for rapid-fire requests
    const recentThreats = ipThreats.filter(threat => 
      Date.now() - threat.timestamp.getTime() < 60000 // Last minute
    )
    
    if (recentThreats.length > 10) {
      this.logThreat({
        type: 'suspicious_activity',
        severity: 'high',
        description: 'Rapid-fire requests detected',
        payload: `${recentThreats.length} requests in last minute`,
        ip,
        userAgent,
        blocked: false,
        context: { rapidFire: true, requestCount: recentThreats.length }
      })
      return true
    }

    // Check for diverse attack patterns
    const threatTypes = new Set(ipThreats.map(threat => threat.type))
    if (threatTypes.size >= 3) {
      this.logThreat({
        type: 'suspicious_activity',
        severity: 'high',
        description: 'Multiple attack vectors from same IP',
        payload: `Attack types: ${Array.from(threatTypes).join(', ')}`,
        ip,
        userAgent,
        blocked: false,
        context: { diverseAttacks: true, attackTypes: Array.from(threatTypes) }
      })
      return true
    }

    return false
  }

  // Check for potential data exfiltration
  detectDataExfiltration(requestSize: number, responseSize: number, ip?: string): boolean {
    const suspiciousRequestSize = 1024 * 1024 // 1MB
    const suspiciousResponseSize = 10 * 1024 * 1024 // 10MB
    
    if (requestSize > suspiciousRequestSize || responseSize > suspiciousResponseSize) {
      this.logThreat({
        type: 'data_exfiltration',
        severity: 'high',
        description: 'Suspicious data transfer detected',
        payload: `Request: ${requestSize} bytes, Response: ${responseSize} bytes`,
        ip,
        blocked: false,
        context: { requestSize, responseSize }
      })
      return true
    }
    
    return false
  }

  // Generate security report
  generateSecurityReport(): {
    summary: SecurityMetrics
    recommendations: string[]
    criticalThreats: SecurityThreat[]
  } {
    const summary = this.getSecurityMetrics()
    const criticalThreats = this.getThreatsBySeverity('critical')
    
    const recommendations: string[] = []
    
    if (summary.blockedIPs > 10) {
      recommendations.push('Consider implementing geographic IP filtering')
    }
    
    if (summary.topThreatTypes.some(t => t.type === 'xss' && t.count > 5)) {
      recommendations.push('Review input sanitization and Content Security Policy')
    }
    
    if (summary.topThreatTypes.some(t => t.type === 'sql_injection' && t.count > 3)) {
      recommendations.push('Audit database queries for SQL injection vulnerabilities')
    }
    
    if (criticalThreats.length > 0) {
      recommendations.push('Immediate review required for critical security threats')
    }
    
    if (summary.threatsToday > summary.totalThreats * 0.5) {
      recommendations.push('Unusual spike in threats today - investigate potential coordinated attack')
    }

    return {
      summary,
      recommendations,
      criticalThreats
    }
  }
}

// Create global security monitor instance
export const securityMonitor = new SecurityMonitor()

// Export types for use in other modules
export type { SecurityThreat, SecurityMetrics }