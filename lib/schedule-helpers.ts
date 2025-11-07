import { prisma } from '@/lib/prisma';

/**
 * Get upcoming class sessions for a student
 * This can be used in the chat context to inform the AI about upcoming classes
 */
export async function getUpcomingClassesForStudent(studentId: string, limit = 5) {
  const now = new Date();

  try {
    // Get student's enrolled courses
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            classSessions: {
              where: {
                startTime: {
                  gte: now,
                },
                status: {
                  in: ['SCHEDULED', 'IN_PROGRESS'],
                },
              },
              orderBy: {
                startTime: 'asc',
              },
              take: limit,
              include: {
                instructor: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Flatten and combine all upcoming classes
    const upcomingClasses = enrollments.flatMap((enrollment) =>
      enrollment.course.classSessions.map((session) => ({
        ...session,
        courseName: enrollment.course.title,
      }))
    );

    // Sort by start time and limit
    return upcomingClasses
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    return [];
  }
}

/**
 * Get upcoming class sessions for a course
 */
export async function getUpcomingClassesForCourse(courseId: string) {
  const now = new Date();

  try {
    const classSessions = await prisma.classSession.findMany({
      where: {
        courseId,
        startTime: {
          gte: now,
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS'],
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return classSessions;
  } catch (error) {
    console.error('Error fetching upcoming classes:', error);
    return [];
  }
}

/**
 * Format upcoming classes for AI chat context
 */
export function formatClassesForChatContext(classes: any[]) {
  if (classes.length === 0) {
    return 'No upcoming classes scheduled.';
  }

  return classes
    .map((cls, index) => {
      const startTime = new Date(cls.startTime);
      const endTime = new Date(cls.endTime);
      return `${index + 1}. ${cls.courseName || 'Class'}: "${cls.title}"
   - Date: ${startTime.toLocaleDateString()}
   - Time: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}
   - Location: ${cls.location || 'TBD'}
   - Instructor: ${cls.instructor?.name || 'TBD'}`;
    })
    .join('\n\n');
}

/**
 * Update status of past classes automatically
 */
export async function updatePastClassesStatus() {
  const now = new Date();

  try {
    await prisma.classSession.updateMany({
      where: {
        endTime: {
          lt: now,
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS'],
        },
      },
      data: {
        status: 'COMPLETED',
      },
    });
  } catch (error) {
    console.error('Error updating past classes status:', error);
  }
}
