import { NextRequest, NextResponse } from 'next/server';
import { getEmailStats, getUserEmailLogs } from '@/lib/email/send';

/**
 * GET /api/email/stats?userId=xxx
 * Get email statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;

    const stats = await getEmailStats(userId);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting email stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
