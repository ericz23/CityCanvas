require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearDatabase() {
  try {
    console.log('🗑️ Clearing Database')
    console.log('===================\n')
    
    // Count events before deletion
    const eventCount = await prisma.event.count()
    console.log(`Events in database before clearing: ${eventCount}`)
    
    // Delete all events
    const deletedEvents = await prisma.event.deleteMany({})
    console.log(`Deleted ${deletedEvents.count} events`)
    
    // Count events after deletion
    const remainingEvents = await prisma.event.count()
    console.log(`Events remaining: ${remainingEvents}`)
    
    // Keep sources for reference
    const sourceCount = await prisma.source.count()
    console.log(`Sources kept: ${sourceCount}`)
    
    console.log('\n✅ Database cleared successfully!')
    
  } catch (error) {
    console.error('Error clearing database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase() 