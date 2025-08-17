require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkEventCount() {
  try {
    console.log('🔍 Checking Database Event Count')
    console.log('===============================\n')
    
    // Count total events
    const totalEvents = await prisma.event.count()
    console.log(`Total events in database: ${totalEvents}`)
    
    // Count events by status
    const activeEvents = await prisma.event.count({
      where: { status: 'ACTIVE' }
    })
    console.log(`Active events: ${activeEvents}`)
    
    // Get all events with their dates
    const allEvents = await prisma.event.findMany({
      select: {
        id: true,
        title: true,
        startsAt: true,
        sourceId: true
      },
      orderBy: {
        startsAt: 'asc'
      }
    })
    
    console.log('\n📅 All Events with Dates:')
    console.log('─'.repeat(80))
    allEvents.forEach((event, index) => {
      const date = event.startsAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${date} - ${event.title}`)
    })
    
    // Count events by source
    const eventsBySource = await prisma.event.groupBy({
      by: ['sourceId'],
      _count: {
        id: true
      }
    })
    
    console.log('\n📊 Events by Source:')
    for (const group of eventsBySource) {
      const source = await prisma.source.findUnique({
        where: { id: group.sourceId }
      })
      console.log(`  ${source?.label || 'Unknown'}: ${group._count.id} events`)
    }
    
    // Get date range of events
    if (allEvents.length > 0) {
      const earliest = allEvents[0].startsAt
      const latest = allEvents[allEvents.length - 1].startsAt
      console.log(`\n📅 Date Range:`)
      console.log(`  Earliest event: ${earliest.toLocaleDateString()}`)
      console.log(`  Latest event: ${latest.toLocaleDateString()}`)
    }
    
    // Count events with coordinates
    const eventsWithCoords = await prisma.event.count({
      where: {
        AND: [
          { lat: { not: null } },
          { lng: { not: null } }
        ]
      }
    })
    console.log(`\n📍 Events with coordinates: ${eventsWithCoords}`)
    console.log(`📍 Events without coordinates: ${totalEvents - eventsWithCoords}`)
    
    // Show events happening in the next 7 days
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingEvents = allEvents.filter(event => 
      event.startsAt >= now && event.startsAt <= nextWeek
    )
    
    console.log(`\n🚀 Events in Next 7 Days: ${upcomingEvents.length}`)
    if (upcomingEvents.length > 0) {
      upcomingEvents.forEach((event, index) => {
        const date = event.startsAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${date} - ${event.title}`)
      })
    }
    
  } catch (error) {
    console.error('Error checking database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkEventCount() 