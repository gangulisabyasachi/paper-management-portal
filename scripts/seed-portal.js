/**
 * Seed script for WISDOM Paper Management Portal.
 * Creates test accounts across all roles (admin, editor, reviewers, submitters)
 * and sample open journal issues.
 *
 * Run with: npm run seed (inside paper-management-portal)
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import PortalUser from '../models/PortalUser.js';
import JournalIssue from '../models/JournalIssue.js';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing in .env.local');
  process.exit(1);
}

const TEST_USERS = [
  {
    name: 'WISDOM Master Admin',
    email: process.env.PORTAL_ADMIN_EMAIL || 'admin@wisdomj.in',
    password: process.env.PORTAL_ADMIN_PASSWORD || 'WisdomAdmin@2026',
    role: 'admin',
    affiliation: 'Jayasree Publications / WISDOM Journal',
    expertise: [],
  },
  {
    name: 'Prof. Subhrangsu Chatterji (Test Editor)',
    email: 'editor@wisdomj.in',
    password: 'TestUser@2026',
    role: 'editor',
    affiliation: 'Calcutta University',
    expertise: ['Constitutional Law', 'Jurisprudence', 'Multidisciplinary'],
  },
  {
    name: 'Prof. Ananya Roy',
    email: 'reviewer1@wisdomj.in',
    password: 'TestUser@2026',
    role: 'reviewer',
    affiliation: 'Jadavpur University',
    expertise: ['Artificial Intelligence', 'Machine Learning', 'Data Science', 'Ethics'],
  },
  {
    name: 'Dr. Vikram Mehta',
    email: 'reviewer2@wisdomj.in',
    password: 'TestUser@2026',
    role: 'reviewer',
    affiliation: 'National Law School of India',
    expertise: ['Constitutional Law', 'Corporate Governance', 'AI Governance', 'Policy'],
  },
  {
    name: 'Dr. Priya Nair',
    email: 'reviewer3@wisdomj.in',
    password: 'TestUser@2026',
    role: 'reviewer',
    affiliation: 'IIM Bangalore',
    expertise: ['Management', 'Finance', 'Supply Chain', 'Sustainability'],
  },
  {
    name: 'Aarav Sen',
    email: 'submitter1@wisdomj.in',
    password: 'TestUser@2026',
    role: 'submitter',
    affiliation: 'University of Calcutta',
    expertise: [],
  },
  {
    name: 'Meera Kulkarni',
    email: 'submitter2@wisdomj.in',
    password: 'TestUser@2026',
    role: 'submitter',
    affiliation: 'IIT Bombay',
    expertise: [],
  },
];

async function main() {
  await mongoose.connect(MONGODB_URI);

  let adminUser = null;
  let editorUser = null;

  for (const u of TEST_USERS) {
    let existing = await PortalUser.findOne({ email: u.email });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(u.password, 12);
      existing = await PortalUser.create({
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        affiliation: u.affiliation,
        expertise: u.expertise,
        status: 'active',
        ...(adminUser && ['reviewer', 'editor'].includes(u.role)
          ? { createdBy: adminUser._id }
          : {}),
      });
      console.log(`Created [${u.role}]: ${u.email}`);
    } else {
      console.log(`Already exists [${existing.role}]: ${u.email}`);
    }

    if (u.role === 'admin' && !adminUser) adminUser = existing;
    if (u.role === 'editor' && !editorUser) editorUser = existing;
  }

  const sampleIssues = [
    {
      volume: 2,
      issue: 2,
      title: 'WISDOM Journal Vol 2 Issue 2',
      status: 'open',
      description: 'Multidisciplinary Call for Papers — Humanities, Law, Management & Technology.',
      submissionDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      reviewDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      ...(editorUser ? { editorInChief: editorUser._id } : {}),
    },
    {
      volume: 4,
      issue: 1,
      title: 'WISDOM Journal Vol 4 Issue 1',
      status: 'open',
      description: 'Upcoming Quarterly Multidisciplinary Issue.',
      submissionDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      reviewDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      ...(editorUser ? { editorInChief: editorUser._id } : {}),
    },
  ];

  for (const iss of sampleIssues) {
    const exists = await JournalIssue.findOne({ volume: iss.volume, issue: iss.issue });
    if (!exists) {
      await JournalIssue.create(iss);
      console.log(`Created Issue: ${iss.title}`);
    } else {
      console.log(`Issue already exists: ${iss.title}`);
    }
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
