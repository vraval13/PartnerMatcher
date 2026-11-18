// Seeds realistic demo data for recording the product walkthrough video.
// Creates 9 accounts (1 presenter + 8 "population" students) covering every
// Sprint 3 / Sprint 4 user story: course + assignment + exam_prep + skill_practice
// matching goals, availability overlap, pending/accepted/rejected/cancelled
// connection requests, favorites, paused matching, and a private (unlisted) goal.
//
// Usage:
//   node scripts/seed-demo-data.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
// (same vars used by lib/supabase/admin.ts). Safe to re-run: it deletes any
// existing @partnermatcher.demo accounts first, then recreates everything fresh.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvFile(relativePath) {
  try {
    const text = readFileSync(new URL(relativePath, import.meta.url), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // file not found — ignore and try the next one.
  }
}

// .env.local takes precedence; .env is this project's actual local file.
loadEnvFile("../.env.local");
loadEnvFile("../.env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env.local first."
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DOMAIN = "partnermatcher.demo";
const PASSWORD = "Demo1234!";
const NY = "America/New_York";
const CHI = "America/Chicago";

// ── Personas ────────────────────────────────────────────────────────────────
// key is used to cross-reference goals/connections/favorites below.
const PEOPLE = [
  {
    key: "jordan",
    full_name: "Jordan Rivera",
    email: `jordan@${DOMAIN}`,
    profile: {
      university: "NYU Tandon School of Engineering",
      major: "Computer Science",
      year_of_study: 3,
      study_style: "mixed",
      comm_pref: "mixed",
      timezone: NY,
    },
  },
  {
    key: "avery",
    full_name: "Avery Chen",
    email: `avery@${DOMAIN}`,
    profile: {
      university: "NYU Tandon School of Engineering",
      major: "Computer Science",
      year_of_study: 2,
      study_style: "visual",
      comm_pref: "video",
      timezone: NY,
    },
  },
  {
    key: "sofia",
    full_name: "Sofia Martinez",
    email: `sofia@${DOMAIN}`,
    profile: {
      university: "NYU Courant Institute",
      major: "Mathematics",
      year_of_study: 4,
      study_style: "reading",
      comm_pref: "in_person",
      timezone: NY,
    },
  },
  {
    key: "marcus",
    full_name: "Marcus Johnson",
    email: `marcus@${DOMAIN}`,
    profile: {
      university: "NYU Tandon School of Engineering",
      major: "Computer Science",
      year_of_study: 3,
      study_style: "kinesthetic",
      comm_pref: "chat",
      timezone: NY,
    },
  },
  {
    key: "priya",
    full_name: "Priya Nair",
    email: `priya@${DOMAIN}`,
    profile: {
      university: "NYU Stern School of Business",
      major: "Business",
      year_of_study: 2,
      study_style: "auditory",
      comm_pref: "video",
      timezone: CHI,
    },
  },
  {
    key: "daniel",
    full_name: "Daniel Okafor",
    email: `daniel@${DOMAIN}`,
    profile: {
      university: "NYU Tandon School of Engineering",
      major: "Data Science",
      year_of_study: 1,
      study_style: "mixed",
      comm_pref: "chat",
      timezone: NY,
    },
  },
  {
    key: "emma",
    full_name: "Emma Rodriguez",
    email: `emma@${DOMAIN}`,
    profile: {
      university: "NYU Tandon School of Engineering",
      major: "Computer Science",
      year_of_study: 2,
      study_style: "visual",
      comm_pref: "mixed",
      timezone: NY,
      matching_paused: true, // US-16: listed goal, but hidden from new searches
    },
  },
  {
    key: "liam",
    full_name: "Liam O'Brien",
    email: `liam@${DOMAIN}`,
    profile: {
      university: "NYU Tandon School of Engineering",
      major: "Computer Science",
      year_of_study: 3,
      study_style: "reading",
      comm_pref: "in_person",
      timezone: NY,
    },
  },
  {
    key: "zara",
    full_name: "Zara Ahmed",
    email: `zara@${DOMAIN}`,
    profile: {
      university: "NYU Tandon School of Engineering",
      major: "Computer Science",
      year_of_study: 1,
      study_style: "kinesthetic",
      comm_pref: "video",
      timezone: NY,
    },
  },
];

// ── Jordan's "My Courses" page (US-23 / course management, 5 = the app's cap) ──
const JORDAN_COURSES = [
  {
    code: "CS-GY 6513",
    name: "Big Data Systems",
    university: "NYU Tandon School of Engineering",
    department: "Computer Science",
    goal: "study",
  },
  {
    code: "CS-GY 6033",
    name: "Design & Analysis of Algorithms",
    university: "NYU Tandon School of Engineering",
    department: "Computer Science",
    goal: "exam_prep",
  },
  {
    code: "CS-GY 6083",
    name: "Intro to Security",
    university: "NYU Tandon School of Engineering",
    department: "Computer Science",
    goal: "project",
  },
  {
    code: "CS-GY 9223",
    name: "Machine Learning",
    university: "NYU Tandon School of Engineering",
    department: "Computer Science",
    goal: "general",
  },
  {
    code: "MATH-UA 140",
    name: "Linear Algebra",
    university: "New York University",
    department: "Mathematics",
    goal: "tutoring",
  },
];

// ── Matching goals (US-01/04/05/06/07/16) ───────────────────────────────────
// One row per goal; `availability` becomes matching_availability rows.
const GOALS = [
  {
    owner: "jordan",
    display_name: "Jordan Rivera",
    category: "course",
    subject_or_skill: "Big Data Systems",
    proficiency_level: "intermediate",
    mode: "course",
    institution: "NYU Tandon School of Engineering",
    course_code: "CS-GY 6513",
    topic: "Big Data Systems",
    timezone: NY,
    location_preference: "online",
    is_listed: true,
    availability: [
      [1, "18:00", "20:00", NY],
      [3, "18:00", "20:00", NY],
      [6, "10:00", "12:00", NY],
    ],
  },
  {
    owner: "jordan",
    display_name: "Jordan Rivera",
    category: "exam_prep",
    subject_or_skill: "Algorithms",
    proficiency_level: "advanced",
    timezone: NY,
    location_preference: "either",
    is_listed: true,
    exam_date: "2026-11-24",
    prep_start: "2026-11-18",
    prep_end: "2026-11-23",
    availability: [
      [2, "19:00", "21:00", NY],
      [4, "19:00", "21:00", NY],
    ],
  },
  {
    // US-07: gives Jordan a skill_practice goal so "find a practice partner" has a real match (Daniel).
    owner: "jordan",
    display_name: "Jordan Rivera",
    category: "skill_practice",
    subject_or_skill: "Python",
    proficiency_level: "beginner",
    timezone: NY,
    location_preference: "online",
    is_listed: true,
    availability: [[1, "20:00", "21:00", NY]],
  },
  {
    owner: "avery",
    display_name: "Avery Chen",
    category: "course",
    subject_or_skill: "Big Data Systems",
    proficiency_level: "intermediate",
    mode: "course",
    institution: "NYU Tandon School of Engineering",
    course_code: "CS-GY 6513",
    topic: "Big Data Systems",
    timezone: NY,
    location_preference: "online",
    is_listed: true,
    availability: [
      [1, "17:00", "19:00", NY],
      [3, "18:00", "20:00", NY],
      [5, "14:00", "16:00", NY],
    ],
  },
  {
    owner: "sofia",
    display_name: "Sofia Martinez",
    category: "course",
    subject_or_skill: "Big Data Systems",
    proficiency_level: "intermediate",
    mode: "assignment",
    institution: "NYU Tandon School of Engineering",
    course_code: "CS-GY 6513",
    topic: "Big Data Systems",
    assignment_id: "HW3-BigData",
    due_date: "2026-11-20",
    timezone: NY,
    location_preference: "in_person",
    location: "Bobst Library, 4th Floor",
    is_listed: true,
    availability: [
      [3, "18:00", "20:00", NY],
      [6, "10:00", "11:00", NY],
    ],
  },
  {
    owner: "marcus",
    display_name: "Marcus Johnson",
    category: "exam_prep",
    subject_or_skill: "Algorithms",
    proficiency_level: "advanced",
    timezone: NY,
    location_preference: "either",
    is_listed: true,
    exam_date: "2026-11-21",
    prep_start: "2026-11-18",
    prep_end: "2026-11-20",
    availability: [
      [2, "19:00", "21:00", NY],
      [4, "20:00", "22:00", NY],
    ],
  },
  {
    owner: "priya",
    display_name: "Priya Nair",
    category: "skill_practice",
    subject_or_skill: "Spanish",
    proficiency_level: "advanced",
    timezone: CHI,
    location_preference: "online",
    is_listed: true,
    availability: [
      [5, "16:00", "18:00", CHI],
      [0, "12:00", "14:00", CHI],
    ],
  },
  {
    owner: "daniel",
    display_name: "Daniel Okafor",
    category: "skill_practice",
    subject_or_skill: "Python",
    proficiency_level: "beginner",
    timezone: NY,
    location_preference: "online",
    is_listed: true,
    availability: [
      [1, "20:00", "21:00", NY],
      [4, "18:00", "19:00", NY],
    ],
  },
  {
    // US-16: listed goal, but owner.matching_paused hides it from new searches.
    owner: "emma",
    display_name: "Emma Rodriguez",
    category: "course",
    subject_or_skill: "Big Data Systems",
    proficiency_level: "beginner",
    mode: "course",
    institution: "NYU Tandon School of Engineering",
    course_code: "CS-GY 6513",
    topic: "Big Data Systems",
    timezone: NY,
    location_preference: "online",
    is_listed: true,
    availability: [
      [1, "18:00", "20:00", NY],
      [3, "19:00", "21:00", NY],
    ],
  },
  {
    // US-01 privacy: is_listed=false keeps this goal out of every search.
    owner: "liam",
    display_name: "Liam O'Brien",
    category: "course",
    subject_or_skill: "Big Data Systems",
    proficiency_level: "intermediate",
    mode: "course",
    institution: "NYU Tandon School of Engineering",
    course_code: "CS-GY 6513",
    topic: "Big Data Systems",
    timezone: NY,
    location_preference: "online",
    is_listed: false,
    availability: [
      [2, "18:00", "20:00", NY],
      [6, "11:00", "13:00", NY],
    ],
  },
  {
    // US-06: a listed exam_prep candidate with no existing connection to Jordan,
    // so the "Algorithms" match search returns a real result (Marcus is excluded — already connected).
    owner: "liam",
    display_name: "Liam O'Brien",
    category: "exam_prep",
    subject_or_skill: "Algorithms",
    proficiency_level: "intermediate",
    timezone: NY,
    location_preference: "either",
    is_listed: true,
    // exam_date must match Jordan's exactly — hasCompatibleScope() requires it for exam_prep.
    exam_date: "2026-11-24",
    prep_start: "2026-11-18",
    prep_end: "2026-11-23",
    availability: [
      [2, "19:00", "21:00", NY],
      [4, "19:00", "21:00", NY],
    ],
  },
  {
    owner: "zara",
    display_name: "Zara Ahmed",
    category: "course",
    subject_or_skill: "Big Data Systems",
    proficiency_level: "beginner",
    mode: "course",
    institution: "NYU Tandon School of Engineering",
    course_code: "CS-GY 6513",
    topic: "Big Data Systems",
    timezone: NY,
    location_preference: "online",
    is_listed: true,
    availability: [
      [1, "18:30", "20:00", NY],
      [3, "17:00", "19:00", NY],
    ],
  },
];

// ── Connection requests (US-08/11/12/13) ────────────────────────────────────
// status: pending | accepted | rejected | cancelled
const CONNECTIONS = [
  {
    from: "sofia",
    to: "jordan",
    status: "accepted",
    session_topic: "Big Data Systems — HW3 review",
    proposed_start: "2026-11-20T23:00:00Z",
    proposed_end: "2026-11-21T00:30:00Z",
    message: "Want to pair on the HW3 assignment before it's due?",
  },
  {
    // Leave pending so the presenter can Accept or Decline live on camera.
    from: "marcus",
    to: "jordan",
    status: "pending",
    session_topic: "Algorithms exam prep",
    proposed_start: "2026-11-19T23:30:00Z",
    proposed_end: "2026-11-20T01:00:00Z",
    message:
      "Saw we're both prepping for the algorithms final — want to run through practice problems?",
  },
  {
    from: "daniel",
    to: "jordan",
    status: "rejected",
    session_topic: "Python basics walkthrough",
    proposed_start: "2026-11-19T01:00:00Z",
    proposed_end: "2026-11-19T02:00:00Z",
    message: "Could you help me with Python fundamentals?",
  },
  {
    from: "zara",
    to: "jordan",
    status: "pending",
    session_topic: "Big Data Systems study group",
    proposed_start: "2026-11-21T22:00:00Z",
    proposed_end: "2026-11-21T23:30:00Z",
    message: "Starting a study group for CS-GY 6513, want in?",
  },
  {
    // Leave pending so the presenter can Cancel live on camera.
    from: "jordan",
    to: "priya",
    status: "pending",
    session_topic: "Spanish conversation practice",
    proposed_start: "2026-11-22T21:00:00Z",
    proposed_end: "2026-11-22T22:00:00Z",
    message: "Would love to practice conversational Spanish with you!",
  },
  {
    // Predates Emma's pause — shows existing connections survive a pause (US-16).
    from: "jordan",
    to: "emma",
    status: "cancelled",
    session_topic: "Big Data Systems midterm review",
    proposed_start: "2026-11-15T23:00:00Z",
    proposed_end: "2026-11-16T00:30:00Z",
    message: "Want to review for the midterm together?",
  },
];

// ── Favorites (US-17) ────────────────────────────────────────────────────────
const FAVORITES = [
  { from: "jordan", to: "avery" },
  { from: "jordan", to: "sofia" },
  { from: "jordan", to: "marcus" },
];

// ── Runner ───────────────────────────────────────────────────────────────────

async function deleteExistingDemoUsers() {
  console.log("Removing any existing @%s accounts...", DOMAIN);
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const stale = (data?.users ?? []).filter((u) => u.email?.endsWith(`@${DOMAIN}`));
  for (const user of stale) {
    const { error: delErr } = await db.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;
  }
  if (stale.length > 0) console.log(`  deleted ${stale.length} existing demo account(s).`);
}

async function createUsers() {
  const ids = {};
  for (const person of PEOPLE) {
    const { data, error } = await db.auth.admin.createUser({
      email: person.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: person.full_name },
    });
    if (error) throw new Error(`createUser(${person.email}): ${error.message}`);
    ids[person.key] = data.user.id;
    console.log(`  created ${person.full_name} <${person.email}>`);
  }
  return ids;
}

async function updateProfiles(ids) {
  for (const person of PEOPLE) {
    const { university, major, year_of_study, study_style, comm_pref, timezone, matching_paused } =
      person.profile;
    const { error } = await db
      .from("profiles")
      .update({
        university,
        major,
        year_of_study,
        study_style,
        comm_pref,
        timezone,
        matching_paused: matching_paused ?? false,
        is_discoverable: true,
        onboarded_at: new Date().toISOString(),
      })
      .eq("user_id", ids[person.key]);
    if (error) throw new Error(`update profile(${person.key}): ${error.message}`);
  }
  console.log(`  onboarded ${PEOPLE.length} profiles.`);
}

async function seedCourses(ids) {
  const courseIds = {};
  for (const course of JORDAN_COURSES) {
    const { data: existing, error: lookupError } = await db
      .from("courses")
      .select("id")
      .eq("code", course.code)
      .eq("university", course.university)
      .maybeSingle();
    if (lookupError) throw new Error(`lookup course(${course.code}): ${lookupError.message}`);
    if (existing) {
      courseIds[course.code] = existing.id;
      continue;
    }
    const { data, error } = await db
      .from("courses")
      .insert({
        code: course.code,
        name: course.name,
        university: course.university,
        department: course.department,
        created_by: ids.jordan,
      })
      .select("id")
      .single();
    if (error) throw new Error(`insert course(${course.code}): ${error.message}`);
    courseIds[course.code] = data.id;
  }

  const rows = JORDAN_COURSES.map((course) => ({
    user_id: ids.jordan,
    course_id: courseIds[course.code],
    goal: course.goal,
    semester: "Fall 2026",
    is_active: true,
  }));
  const { error } = await db.from("user_courses").insert(rows);
  if (error) throw new Error(`insert user_courses: ${error.message}`);
  console.log(`  added ${rows.length} courses to Jordan's profile.`);
}

async function seedGoals(ids) {
  for (const goal of GOALS) {
    const row = {
      user_id: ids[goal.owner],
      information_version: 2,
      category: goal.category,
      subject_or_skill: goal.subject_or_skill,
      proficiency_level: goal.proficiency_level,
      mode: goal.mode ?? null,
      display_name: goal.display_name,
      institution: goal.institution ?? null,
      course_code: goal.course_code ?? null,
      topic: goal.topic ?? null,
      assignment_id: goal.assignment_id ?? null,
      due_date: goal.due_date ?? null,
      exam_date: goal.exam_date ?? null,
      prep_start: goal.prep_start ?? null,
      prep_end: goal.prep_end ?? null,
      timezone: goal.timezone,
      location_preference: goal.location_preference,
      location: goal.location ?? "",
      is_listed: goal.is_listed,
    };
    const { data, error } = await db.from("matching_goals").insert(row).select("id").single();
    if (error)
      throw new Error(`insert goal(${goal.owner}/${goal.subject_or_skill}): ${error.message}`);

    const slots = goal.availability.map(([weekday, start_time, end_time, timezone]) => ({
      goal_id: data.id,
      weekday,
      start_time: `${start_time}:00`,
      end_time: `${end_time}:00`,
      timezone,
    }));
    const { error: slotErr } = await db.from("matching_availability").insert(slots);
    if (slotErr) throw new Error(`insert availability(${goal.owner}): ${slotErr.message}`);
  }
  console.log(`  created ${GOALS.length} matching goals with availability.`);
}

async function seedConnections(ids) {
  const rows = CONNECTIONS.map((c) => ({
    requester_id: ids[c.from],
    receiver_id: ids[c.to],
    status: c.status,
    session_topic: c.session_topic,
    proposed_start: c.proposed_start,
    proposed_end: c.proposed_end,
    message: c.message,
  }));
  const { error } = await db.from("connections").insert(rows);
  if (error) throw new Error(`insert connections: ${error.message}`);
  console.log(`  created ${rows.length} connection requests.`);
}

async function seedFavorites(ids) {
  const rows = FAVORITES.map((f) => ({
    user_id: ids[f.from],
    favorite_user_id: ids[f.to],
  }));
  const { error } = await db.from("favorite_partners").insert(rows);
  if (error) throw new Error(`insert favorites: ${error.message}`);
  console.log(`  created ${rows.length} favorites.`);
}

async function main() {
  await deleteExistingDemoUsers();

  console.log("\nCreating accounts...");
  const ids = await createUsers();

  console.log("\nCompleting onboarding...");
  await updateProfiles(ids);

  console.log("\nSeeding Jordan's courses...");
  await seedCourses(ids);

  console.log("\nSeeding matching goals + availability...");
  await seedGoals(ids);

  console.log("\nSeeding connection requests...");
  await seedConnections(ids);

  console.log("\nSeeding favorites...");
  await seedFavorites(ids);

  console.log("\nDone. Sign in as the presenter account:\n");
  console.log(`  email:    jordan@${DOMAIN}`);
  console.log(`  password: ${PASSWORD}`);
  console.log(`\nAll ${PEOPLE.length} accounts share the password "${PASSWORD}".`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
