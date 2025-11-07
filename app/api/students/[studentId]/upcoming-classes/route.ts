import { NextRequest, NextResponse } from 'next/server';
import { getUpcomingClassesForStudent, formatClassesForChatContext } from '@/lib/schedule-helpers';

/**
 * GET /api/students/[studentId]/upcoming-classes
 *
 * Returns upcoming classes for a student in a format suitable for AI chat context
 * This endpoint can be called when initializing a chat session to provide
 * the AI with information about upcoming classes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { studentId } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const format = searchParams.get('format') || 'json'; // 'json' or 'text'

    const upcomingClasses = await getUpcomingClassesForStudent(studentId, limit);

    if (format === 'text') {
      // Return formatted text for AI context
      const formattedText = formatClassesForChatContext(upcomingClasses);
      return NextResponse.json({
        studentId,
        count: upcomingClasses.length,
        context: formattedText,
      });
    }

    // Return JSON format
    return NextResponse.json({
      studentId,
      count: upcomingClasses.length,
      upcomingClasses,
    });
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming classes' },
      { status: 500 }
    );
  }
}
