'use client'

import { PasswordStrength } from '@/types'
import { useMemo } from 'react'

interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  if (!password) return null

  const strengthConfig = {
    [PasswordStrength.WEAK]: {
      label: 'Weak',
      color: 'bg-red-500',
      width: 'w-1/4',
      textColor: 'text-red-600',
    },
    [PasswordStrength.FAIR]: {
      label: 'Fair',
      color: 'bg-orange-500',
      width: 'w-2/4',
      textColor: 'text-orange-600',
    },
    [PasswordStrength.GOOD]: {
      label: 'Good',
      color: 'bg-yellow-500',
      width: 'w-3/4',
      textColor: 'text-yellow-600',
    },
    [PasswordStrength.STRONG]: {
      label: 'Strong',
      color: 'bg-green-500',
      width: 'w-full',
      textColor: 'text-green-600',
    },
  }

  const config = strengthConfig[strength]

  return (
    <div className="mt-2 space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`${config.color} ${config.width} transition-all duration-300`}
        />
      </div>
      <p className={`text-xs font-medium ${config.textColor}`}>
        Password strength: {config.label}
      </p>
    </div>
  )
}

function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) return PasswordStrength.WEAK

  let score = 0

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Character variety checks
  if (/[a-z]/.test(password)) score++ // Lowercase
  if (/[A-Z]/.test(password)) score++ // Uppercase
  if (/[0-9]/.test(password)) score++ // Numbers
  if (/[^a-zA-Z0-9]/.test(password)) score++ // Special characters

  // Determine strength based on score
  if (score <= 2) return PasswordStrength.WEAK
  if (score <= 3) return PasswordStrength.FAIR
  if (score <= 4) return PasswordStrength.GOOD
  return PasswordStrength.STRONG
}
