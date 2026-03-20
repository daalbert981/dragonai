/**
 * Account Setup API
 *
 * Allows new students to complete their account setup using a setup token
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

/**
 * GET /api/setup?token=xxx
 *
 * Verify setup token and return user information
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Setup token is required' },
        { status: 400 }
      )
    }

    // Find user with this setup token
    const user = await prisma.user.findUnique({
      where: { setupToken: token },
      select: {
        id: true,
        email: true,
        username: true,
        setupTokenExpiry: true,
        password: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid setup token' },
        { status: 404 }
      )
    }

    // Check if token expired
    if (user.setupTokenExpiry && user.setupTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Setup token has expired' },
        { status: 410 }
      )
    }

    // Check if account already set up
    if (user.password) {
      return NextResponse.json(
        { error: 'Account already set up. Please login.' },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        username: user.username
      }
    })

  } catch (error) {
    console.error('[SETUP] Error verifying token:', error)
    return NextResponse.json(
      { error: 'Failed to verify setup token' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/setup
 *
 * Complete account setup with password
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, password, username } = body

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Find user with this setup token
    const user = await prisma.user.findUnique({
      where: { setupToken: token }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid setup token' },
        { status: 404 }
      )
    }

    // Check if token expired
    if (user.setupTokenExpiry && user.setupTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: 'Setup token has expired' },
        { status: 410 }
      )
    }

    // Check if account already set up
    if (user.password) {
      return NextResponse.json(
        { error: 'Account already set up. Please login.' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user account
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        username: username || user.username,
        setupToken: null, // Clear setup token
        setupTokenExpiry: null
      }
    })

    console.log(`[SETUP] Account setup completed for user: ${user.email}`)

    return NextResponse.json({
      success: true,
      message: 'Account setup completed successfully'
    })

  } catch (error) {
    console.error('[SETUP] Error completing setup:', error)
    return NextResponse.json(
      { error: 'Failed to complete account setup' },
      { status: 500 }
    )
  }
}
