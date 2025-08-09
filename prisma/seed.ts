const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create sample sources
  const sources = await Promise.all([
    prisma.source.upsert({
      where: { url: 'https://sfrecpark.org/events' },
      update: {},
      create: {
        url: 'https://sfrecpark.org/events',
        label: 'SF Recreation & Parks',
        kind: 'OFFICIAL_CAL',
        lastSeen: new Date(),
      },
    }),
    prisma.source.upsert({
      where: { url: 'https://www.eventbrite.com/d/ca--san-francisco/events' },
      update: {},
      create: {
        url: 'https://www.eventbrite.com/d/ca--san-francisco/events',
        label: 'Eventbrite SF',
        kind: 'TICKET_SITE',
        lastSeen: new Date(),
      },
    }),
    prisma.source.upsert({
      where: { url: 'https://www.sfchronicle.com/events' },
      update: {},
      create: {
        url: 'https://www.sfchronicle.com/events',
        label: 'SF Chronicle Events',
        kind: 'MEDIA',
        lastSeen: new Date(),
      },
    }),
  ])

  console.log(`Created ${sources.length} sources`)

  // Create sample events based on the existing seed data structure
  const sampleEvents = [
    {
      title: 'Golden Gate Park Concert Series',
      description: 'Free outdoor concert in the beautiful Golden Gate Park',
      startsAt: new Date('2025-08-15T18:00:00-07:00'),
      endsAt: new Date('2025-08-15T20:00:00-07:00'),
      venueName: 'Golden Gate Park Bandshell',
      address: 'Music Concourse Dr, San Francisco, CA',
      lat: 37.7691,
      lng: -122.4835,
      categories: ['music', 'outdoor'],
      tags: ['free', 'outdoor'],
      isFree: true,
      priceMin: 0,
      priceMax: 0,
      sourceId: sources[0].id,
      sourceConfidence: 0.9,
      sourceHash: 'golden-gate-park-concert-series|2025-08-15t18:00:00|golden-gate-park-bandshell',
    },
    {
      title: 'SF Tech Meetup: AI and Machine Learning',
      description: 'Join us for an evening of discussions about the latest in AI and ML',
      startsAt: new Date('2025-08-16T19:00:00-07:00'),
      endsAt: new Date('2025-08-16T21:00:00-07:00'),
      venueName: 'Mission Bay Conference Center',
      address: '1675 Owens St, San Francisco, CA',
      lat: 37.7699,
      lng: -122.3933,
      categories: ['tech'],
      tags: ['indoor', 'night'],
      isFree: false,
      priceMin: 25,
      priceMax: 50,
      ticketUrl: 'https://example.com/tickets',
      sourceId: sources[1].id,
      sourceConfidence: 0.8,
      sourceHash: 'sf-tech-meetup-ai-and-machine-learning|2025-08-16t19:00:00|mission-bay-conference-center',
    },
    {
      title: 'Farmers Market at Ferry Building',
      description: 'Local produce, artisanal foods, and handmade crafts',
      startsAt: new Date('2025-08-17T08:00:00-07:00'),
      endsAt: new Date('2025-08-17T14:00:00-07:00'),
      venueName: 'Ferry Building Marketplace',
      address: '1 Ferry Building, San Francisco, CA',
      lat: 37.7956,
      lng: -122.3939,
      categories: ['market', 'food'],
      tags: ['outdoor', 'family'],
      isFree: true,
      priceMin: 0,
      priceMax: 0,
      sourceId: sources[2].id,
      sourceConfidence: 0.85,
      sourceHash: 'farmers-market-at-ferry-building|2025-08-17t08:00:00|ferry-building-marketplace',
    },
  ]

  const events = await Promise.all(
    sampleEvents.map(async (eventData) => {
      return prisma.event.upsert({
        where: { sourceHash: eventData.sourceHash },
        update: eventData,
        create: eventData,
      })
    })
  )

  console.log(`Created ${events.length} sample events`)

  // Output some statistics
  const totalEvents = await prisma.event.count()
  const totalSources = await prisma.source.count()
  
  console.log(`Database seeded successfully!`)
  console.log(`Total events: ${totalEvents}`)
  console.log(`Total sources: ${totalSources}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 