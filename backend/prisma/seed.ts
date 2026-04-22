import { PrismaClient, Role, EventCategory, EventStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Password123!', 12);

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@example.com' },
    update: {},
    create: {
      email: 'organizer@example.com',
      name: 'Acme Events',
      passwordHash: password,
      role: Role.ORGANIZER,
      companyName: 'Acme Events Pvt Ltd',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Demo User',
      passwordHash: password,
      role: Role.USER,
    },
  });

  const existing = await prisma.event.count();
  if (existing === 0) {
    await prisma.event.createMany({
      data: [
        {
          organizerId: organizer.id,
          title: 'Sunset Beats Music Festival',
          description: 'An open-air music festival featuring indie and electronic artists.',
          category: EventCategory.MUSIC,
          venue: 'Phoenix Marina Grounds',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'IN',
          latitude: 13.0827,
          longitude: 80.2707,
          startAt: new Date(Date.now() + 14 * 864e5),
          endAt: new Date(Date.now() + 14 * 864e5 + 5 * 36e5),
          priceCents: 129900,
          capacity: 2000,
          status: EventStatus.PUBLISHED,
          bannerUrl: null,
        },
        {
          organizerId: organizer.id,
          title: 'Premier Cricket League – Final',
          description: 'The ultimate showdown of the season.',
          category: EventCategory.SPORTS,
          venue: 'M. A. Chidambaram Stadium',
          city: 'Chennai',
          state: 'Tamil Nadu',
          country: 'IN',
          latitude: 13.0629,
          longitude: 80.2793,
          startAt: new Date(Date.now() + 7 * 864e5),
          endAt: new Date(Date.now() + 7 * 864e5 + 4 * 36e5),
          priceCents: 249900,
          capacity: 30000,
          status: EventStatus.PUBLISHED,
        },
        {
          organizerId: organizer.id,
          title: 'TechCon Bengaluru 2026',
          description: 'Three days of talks on AI, distributed systems, and developer tooling.',
          category: EventCategory.CONFERENCE,
          venue: 'Bangalore International Exhibition Centre',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'IN',
          latitude: 13.0716,
          longitude: 77.475,
          startAt: new Date(Date.now() + 30 * 864e5),
          endAt: new Date(Date.now() + 32 * 864e5),
          priceCents: 499900,
          capacity: 800,
          status: EventStatus.PUBLISHED,
        },
      ],
    });
  }

  console.log({ organizer: organizer.email, user: user.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
