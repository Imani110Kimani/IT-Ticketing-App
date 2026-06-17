require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

const rawPassword = process.env.PGPASSWORD;
const password = rawPassword === undefined || rawPassword === null || rawPassword === "" ? undefined : String(rawPassword);

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: String(process.env.DATABASE_URL),
      ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined
    }
  : {
      host: String(process.env.PGHOST || "localhost"),
      port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      database: String(process.env.PGDATABASE || "IT_Ticketing"),
      user: String(process.env.PGUSER || "postgres"),
      password,
      ssl: process.env.PG_SSL === "true" ? { rejectUnauthorized: false } : undefined
    };

if (password !== undefined && typeof password !== "string") {
  throw new Error("PGPASSWORD must be a string. Use quotes when setting the environment variable in PowerShell, e.g. $env:PGPASSWORD = 'your_password'.");
}

const pool = new Pool(poolConfig);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend")));

function seedKnowledge() {
  return [
    {
      title: "How to Reset MFA for Company Accounts",
      body: "Use the identity portal, select Security Info, then re-register your authenticator app in 3 steps.",
      tag: "Identity"
    },
    {
      title: "Fixing VPN Connection and DNS Errors",
      body: "Check split tunneling profile, renew IP configuration, and restart secure tunnel service.",
      tag: "Networking"
    },
    {
      title: "Outlook Sync Troubleshooting Checklist",
      body: "Verify mailbox size, sync interval, and focus assist rules on desktop and mobile.",
      tag: "Email"
    },
    {
      title: "Self-Service Printer Recovery Guide",
      body: "Clear stale print jobs, reconnect to the queue, and validate print spooler status.",
      tag: "Hardware"
    },
    {
      title: "Laptop Running Slow: First 10-Minute Fixes",
      body: "Close high-memory apps, run quick malware scan, and free startup processes.",
      tag: "Performance"
    },
    {
      title: "Requesting Software Access or Licenses",
      body: "Submit a software request ticket with business reason and manager approval details.",
      tag: "Access"
    }
  ];
}

function seedTickets() {
  return [
    {
      ticketNumber: "INC-4102",
      title: "VPN disconnects every 15 minutes",
      description: "Remote connection drops repeatedly when using corporate VPN on Windows laptop.",
      requester: "Jordan Kim",
      requesterId: 2,
      priority: "High",
      status: "In Progress",
      assignee: "Nina Patel",
      createdAt: "2026-05-22T09:10:00",
      comments: [
        { author: "Jordan Kim", text: "Started happening after the last update.", createdAt: "2026-05-22T09:12:00" },
        { author: "Nina Patel", text: "Investigating client logs and adapter settings.", createdAt: "2026-05-22T11:45:00" }
      ]
    },
    {
      ticketNumber: "INC-4105",
      title: "Printer on floor 4 is offline",
      description: "Finance team cannot print to printer FIN-4B despite network being available.",
      requester: "Maria Gomez",
      requesterId: 2,
      priority: "Medium",
      status: "Open",
      assignee: "Unassigned",
      createdAt: "2026-05-23T11:30:00",
      comments: [
        { author: "Maria Gomez", text: "Happening for everyone in our team.", createdAt: "2026-05-23T11:32:00" }
      ]
    },
    {
      ticketNumber: "INC-4109",
      title: "Email sync delay on mobile",
      description: "Outlook mobile notifications are delayed by over 20 minutes.",
      requester: "Theo Wang",
      requesterId: 2,
      priority: "Low",
      status: "Resolved",
      assignee: "Arun Das",
      createdAt: "2026-05-24T14:45:00",
      comments: [
        { author: "Arun Das", text: "Mailbox policy refreshed. Please confirm now.", createdAt: "2026-05-24T15:00:00" },
        { author: "Theo Wang", text: "Working fine now, thanks.", createdAt: "2026-05-24T15:18:00" }
      ]
    }
  ];
}

async function ensureDatabaseReady() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      requester_id INTEGER REFERENCES users(id),
      requester TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tag TEXT NOT NULL
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 1;
  `);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: userRows } = await client.query("SELECT COUNT(*) FROM users");
    if (Number(userRows[0].count) === 0) {
      const defaultUsers = [
        {
          name: "IT Admin",
          email: "it@company.com",
          role: "it_admin",
          passwordHash: bcrypt.hashSync("Passw0rd!", 10),
          capacity: 3,
          schedule: [
            { day: "Monday", start: "09:00", end: "17:00" },
            { day: "Tuesday", start: "09:00", end: "17:00" },
            { day: "Wednesday", start: "09:00", end: "17:00" },
            { day: "Thursday", start: "09:00", end: "17:00" },
            { day: "Friday", start: "09:00", end: "17:00" }
          ]
        },
        {
          name: "IT Specialist 1",
          email: "it1@company.com",
          role: "it_staff",
          passwordHash: bcrypt.hashSync("Passw0rd!", 10),
          capacity: 3,
          schedule: [
            { day: "Monday", start: "10:00", end: "18:00" },
            { day: "Tuesday", start: "10:00", end: "18:00" },
            { day: "Wednesday", start: "10:00", end: "18:00" },
            { day: "Thursday", start: "10:00", end: "18:00" },
            { day: "Friday", start: "10:00", end: "18:00" }
          ]
        },
        {
          name: "IT Specialist 2",
          email: "it2@company.com",
          role: "it_staff",
          passwordHash: bcrypt.hashSync("Passw0rd!", 10),
          capacity: 2,
          schedule: [
            { day: "Monday", start: "08:00", end: "16:00" },
            { day: "Tuesday", start: "08:00", end: "16:00" },
            { day: "Wednesday", start: "08:00", end: "16:00" },
            { day: "Thursday", start: "08:00", end: "16:00" },
            { day: "Friday", start: "08:00", end: "16:00" }
          ]
        },
        {
          name: "IT Specialist 3",
          email: "it3@company.com",
          role: "it_staff",
          passwordHash: bcrypt.hashSync("Passw0rd!", 10),
          capacity: 2,
          schedule: [
            { day: "Tuesday", start: "12:00", end: "20:00" },
            { day: "Wednesday", start: "12:00", end: "20:00" },
            { day: "Thursday", start: "12:00", end: "20:00" },
            { day: "Friday", start: "12:00", end: "20:00" },
            { day: "Saturday", start: "09:00", end: "15:00" }
          ]
        },
        {
          name: "IT Specialist 4",
          email: "it4@company.com",
          role: "it_staff",
          passwordHash: bcrypt.hashSync("Passw0rd!", 10),
          capacity: 2,
          schedule: [
            { day: "Monday", start: "09:00", end: "15:00" },
            { day: "Wednesday", start: "09:00", end: "15:00" },
            { day: "Thursday", start: "12:00", end: "18:00" },
            { day: "Friday", start: "09:00", end: "15:00" }
          ]
        },
        {
          name: "Employee Demo",
          email: "employee@company.com",
          role: "employee",
          passwordHash: bcrypt.hashSync("Passw0rd!", 10),
          capacity: 1,
          schedule: []
        }
      ];

      for (const user of defaultUsers) {
        await client.query(
          "INSERT INTO users (name, email, role, password_hash, schedule, capacity) VALUES ($1, $2, $3, $4, $5, $6)",
          [user.name, user.email, user.role, user.passwordHash, JSON.stringify(user.schedule), user.capacity]
        );
      }
    }

    const { rows: ticketCountRows } = await client.query("SELECT COUNT(*) FROM tickets");
    if (Number(ticketCountRows[0].count) === 0) {
      const { rows: users } = await client.query("SELECT id, name FROM users ORDER BY id");
      const demoUser = users.find((user) => user.email === "employee@company.com") || users[0];
      const tickets = seedTickets();

      for (const ticket of tickets) {
        const result = await client.query(
          `INSERT INTO tickets (ticket_number, title, description, requester_id, requester, priority, status, assignee, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [ticket.ticketNumber, ticket.title, ticket.description, demoUser.id, ticket.requester, ticket.priority, ticket.status, ticket.assignee, ticket.createdAt]
        );

        const ticketId = result.rows[0].id;
        for (const comment of ticket.comments) {
          await client.query(
            "INSERT INTO comments (ticket_id, author, text, created_at) VALUES ($1, $2, $3, $4)",
            [ticketId, comment.author, comment.text, comment.createdAt]
          );
        }
      }
    }

    const { rows: kbRows } = await client.query("SELECT COUNT(*) FROM knowledge_base");
    if (Number(kbRows[0].count) === 0) {
      const knowledgeBase = seedKnowledge();
      for (const article of knowledgeBase) {
        await client.query(
          "INSERT INTO knowledge_base (title, body, tag) VALUES ($1, $2, $3)",
          [article.title, article.body, article.tag]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function parseDailyTime(value) {
  const [hours, minutes] = String(value).split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : NaN;
}

function isAvailableWithinNext48Hours(schedule) {
  if (!Array.isArray(schedule) || !schedule.length) {
    return false;
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  while (current <= horizon) {
    const dayName = dayNames[current.getDay()];
    const todayBlocks = schedule.filter((block) => block.day === dayName);

    for (const block of todayBlocks) {
      const startMinutes = parseDailyTime(block.start);
      const endMinutes = parseDailyTime(block.end);
      if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) continue;

      const blockStart = new Date(current.getFullYear(), current.getMonth(), current.getDate(), Math.floor(startMinutes / 60), startMinutes % 60);
      const blockEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate(), Math.floor(endMinutes / 60), endMinutes % 60);

      if (blockEnd > now && blockStart < horizon) {
        return true;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return false;
}

async function getOpenTicketCounts() {
  const result = await pool.query(
    `SELECT assignee, COUNT(*) AS count
     FROM tickets
     WHERE status != 'Resolved' AND assignee != 'Unassigned'
     GROUP BY assignee`
  );

  return result.rows.reduce((acc, row) => {
    acc[row.assignee] = Number(row.count);
    return acc;
  }, {});
}

async function selectBestAssignee() {
  const staffResult = await pool.query("SELECT name, schedule, capacity FROM users WHERE role = 'it_staff' ORDER BY name");
  const staff = staffResult.rows;
  if (!staff.length) {
    return "Unassigned";
  }

  const openCounts = await getOpenTicketCounts();
  const candidates = staff.filter((user) => isAvailableWithinNext48Hours(user.schedule));
  const assignmentPool = candidates.length ? candidates : staff;

  assignmentPool.sort((a, b) => {
    const aCount = openCounts[a.name] || 0;
    const bCount = openCounts[b.name] || 0;
    const aCapacity = a.capacity || 1;
    const bCapacity = b.capacity || 1;
    const aScore = aCount / aCapacity;
    const bScore = bCount / bCapacity;

    if (aScore !== bScore) {
      return aScore - bScore;
    }
    if (aCount !== bCount) {
      return aCount - bCount;
    }
    return a.name.localeCompare(b.name);
  });

  return assignmentPool[0].name;
}

function issueToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function isItRole(role) {
  return ["it", "it_admin", "it_staff"].includes(role);
}

function roleRequired(role) {
  return (req, res, next) => {
    if (role === "it") {
      if (!isItRole(req.user.role)) {
        return res.status(403).json({ error: "Insufficient permissions." });
      }
      return next();
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    return next();
  };
}

function wrap(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function getUserByEmail(email) {
  const result = await pool.query(
    "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0];
}

async function getUserById(id) {
  const result = await pool.query(
    "SELECT id, name, email, role FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0];
}

async function getKnowledgeBase() {
  const result = await pool.query(
    "SELECT id, title, body, tag FROM knowledge_base ORDER BY id"
  );
  return result.rows;
}

async function isValidStaffAssignee(name) {
  if (!name || !String(name).trim()) {
    return false;
  }

  const result = await pool.query(
    "SELECT 1 FROM users WHERE name = $1 AND role = 'it_staff'",
    [String(name).trim()]
  );

  return result.rowCount > 0;
}

function validateSchedule(schedule) {
  if (!Array.isArray(schedule)) {
    return false;
  }

  const validDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return schedule.every((block) => {
    if (!block || typeof block !== "object") {
      return false;
    }
    const day = String(block.day || "").trim();
    const start = String(block.start || "").trim();
    const end = String(block.end || "").trim();
    return validDays.includes(day) && /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && start < end;
  });
}

app.patch(
  "/api/staff/:id/schedule",
  authRequired,
  roleRequired("it"),
  wrap(async (req, res) => {
    const schedule = req.body?.schedule;

    if (typeof schedule === "undefined") {
      return res.status(400).json({ error: "Schedule is required." });
    }

    if (!validateSchedule(schedule)) {
      return res.status(400).json({ error: "Invalid schedule format." });
    }

    const userResult = await pool.query("SELECT id, role FROM users WHERE id = $1", [req.params.id]);
    if (!userResult.rows.length || !isItRole(userResult.rows[0].role)) {
      return res.status(404).json({ error: "IT user not found." });
    }

    const targetUser = userResult.rows[0];
    if (req.user.role !== "it_admin" && req.user.sub !== targetUser.id) {
      return res.status(403).json({ error: "You can only update your own schedule." });
    }

    await pool.query("UPDATE users SET schedule = $1 WHERE id = $2", [JSON.stringify(schedule), req.params.id]);
    return res.json({ success: true });
  })
);

async function getTicketsForUser(user) {
  const baseQuery = `
    SELECT
      t.id AS ticket_id,
      t.ticket_number AS id,
      t.title,
      t.description,
      t.requester,
      t.requester_id AS "requesterId",
      t.priority,
      t.status,
      t.assignee,
      to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt",
      COALESCE(
        json_agg(
          json_build_object(
            'author', c.author,
            'text', c.text,
            'createdAt', to_char(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS')
          )
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'
      ) AS comments
    FROM tickets t
    LEFT JOIN comments c ON c.ticket_id = t.id
  `;

  if (isItRole(user.role)) {
    const result = await pool.query(
      `${baseQuery} GROUP BY t.id, t.ticket_number, t.title, t.description, t.requester, t.requester_id, t.priority, t.status, t.assignee, t.created_at ORDER BY t.created_at DESC`
    );

    return result.rows.map((ticket) => ({ ...ticket, internalId: ticket.ticket_id }));
  }

  const result = await pool.query(
    `${baseQuery}
      WHERE t.requester_id = $1 OR EXISTS (
        SELECT 1 FROM comments c2 WHERE c2.ticket_id = t.id AND c2.author = $2
      )
      GROUP BY t.id, t.ticket_number, t.title, t.description, t.requester, t.requester_id, t.priority, t.status, t.assignee, t.created_at
      ORDER BY t.created_at DESC`,
    [user.sub, user.name]
  );

  return result.rows.map((ticket) => ({ ...ticket, internalId: ticket.ticket_id }));
}

async function getTicketByNumber(ticketNumber) {
  const result = await pool.query(
    `
      SELECT
        t.id AS ticket_id,
        t.ticket_number AS id,
        t.title,
        t.description,
        t.requester,
        t.requester_id AS "requesterId",
        t.priority,
        t.status,
        t.assignee,
        to_char(t.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt"
      FROM tickets t
      WHERE t.ticket_number = $1
    `,
    [ticketNumber]
  );

  if (!result.rows.length) {
    return null;
  }

  const ticket = result.rows[0];
  const commentsResult = await pool.query(
    `SELECT author, text, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS "createdAt" FROM comments WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [ticket.ticket_id]
  );

  return {
    ...ticket,
    comments: commentsResult.rows,
    internalId: ticket.ticket_id
  };
}

async function createTicket({ title, description, priority, requesterId, requester }) {
  const nextNumberRow = await pool.query(
    "SELECT MAX(CAST(REGEXP_REPLACE(ticket_number, '\\D+', '', 'g') AS INTEGER)) AS max_num FROM tickets"
  );
  const nextNumber = nextNumberRow.rows[0].max_num ? Number(nextNumberRow.rows[0].max_num) + 1 : 4102;
  const ticketNumber = `INC-${nextNumber}`;
  const assignee = await selectBestAssignee();
  const status = "Open";

  const insertResult = await pool.query(
    `INSERT INTO tickets (ticket_number, title, description, requester_id, requester, priority, status, assignee, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
    [ticketNumber, title, description, requesterId, requester, priority, status, assignee]
  );

  const ticketId = insertResult.rows[0].id;
  const commentText = assignee === "Unassigned" ? "Ticket submitted." : `Ticket submitted and assigned to ${assignee}.`;

  await pool.query(
    `INSERT INTO comments (ticket_id, author, text, created_at) VALUES ($1, $2, $3, NOW())`,
    [ticketId, requester, commentText]
  );

  return getTicketByNumber(ticketNumber);
}

async function addComment(ticketId, author, text) {
  await pool.query(
    "INSERT INTO comments (ticket_id, author, text, created_at) VALUES ($1, $2, $3, NOW())",
    [ticketId, author, text]
  );
  const ticketNumberResult = await pool.query("SELECT ticket_number FROM tickets WHERE id = $1", [ticketId]);
  return getTicketByNumber(ticketNumberResult.rows[0].ticket_number);
}

async function updateTicket(ticketNumber, status, assignee) {
  const ticket = await getTicketByNumber(ticketNumber);
  if (!ticket) {
    return null;
  }

  if (status) {
    await pool.query("UPDATE tickets SET status = $1 WHERE id = $2", [status, ticket.internalId]);
    if (status === "Resolved") {
      await pool.query(
        "INSERT INTO comments (ticket_id, author, text, created_at) VALUES ($1, $2, $3, NOW())",
        [ticket.internalId, "System", "Ticket marked as resolved."]
      );
    }
  }

  if (typeof assignee !== "undefined") {
    const normalizedAssignee = String(assignee).trim() || "Unassigned";
    await pool.query("UPDATE tickets SET assignee = $1 WHERE id = $2", [normalizedAssignee, ticket.internalId]);
  }

  return getTicketByNumber(ticketNumber);
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post(
  "/api/auth/register",
  wrap(async (req, res) => {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const normalizedRole = role === "it" || role === "it_staff" ? "it_staff" : "employee";
    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await getUserByEmail(normalizedEmail);

    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const result = await pool.query(
      "INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
      [String(name).trim(), normalizedEmail, normalizedRole, bcrypt.hashSync(password, 10)]
    );

    const user = result.rows[0];
    return res.status(201).json({ token: issueToken(user), user: sanitizeUser(user) });
  })
);

app.post(
  "/api/auth/login",
  wrap(async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await getUserByEmail(normalizedEmail);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return res.json({ token: issueToken(user), user: sanitizeUser(user) });
  })
);

app.get(
  "/api/auth/me",
  authRequired,
  wrap(async (req, res) => {
    const user = await getUserById(req.user.sub);

    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    return res.json({ user: sanitizeUser(user) });
  })
);

app.get(
  "/api/knowledge",
  authRequired,
  wrap(async (req, res) => {
    const knowledgeBase = await getKnowledgeBase();
    res.json({ knowledgeBase });
  })
);

app.get(
  "/api/staff",
  authRequired,
  roleRequired("it"),
  wrap(async (req, res) => {
    const result = await pool.query("SELECT id, name, role, schedule, capacity FROM users WHERE role IN ('it_admin', 'it_staff') ORDER BY name");
    const openCounts = await getOpenTicketCounts();

    const staff = result.rows.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      schedule: user.schedule || [],
      capacity: user.capacity || 1,
      openTickets: openCounts[user.name] || 0,
      loadRatio: Number(((openCounts[user.name] || 0) / (user.capacity || 1)).toFixed(2)),
      availableNext48Hours: isAvailableWithinNext48Hours(user.schedule || [])
    }));

    res.json({ staff });
  })
);

app.get(
  "/api/tickets",
  authRequired,
  wrap(async (req, res) => {
    const tickets = await getTicketsForUser(req.user);
    res.json({ tickets });
  })
);

app.post(
  "/api/tickets",
  authRequired,
  wrap(async (req, res) => {
    const { title, description, priority } = req.body || {};

    if (!title || !description || !priority) {
      return res.status(400).json({ error: "Title, description, and priority are required." });
    }

    if (!["Low", "Medium", "High"].includes(priority)) {
      return res.status(400).json({ error: "Priority must be Low, Medium, or High." });
    }

    const ticket = await createTicket({
      title: String(title).trim(),
      description: String(description).trim(),
      priority,
      requesterId: req.user.sub,
      requester: req.user.name
    });

    res.status(201).json({ ticket });
  })
);

app.post(
  "/api/tickets/:id/comments",
  authRequired,
  wrap(async (req, res) => {
    const { text } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Comment text is required." });
    }

    const ticket = await getTicketByNumber(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    if (!isItRole(req.user.role) && ticket.requesterId !== req.user.sub) {
      return res.status(403).json({ error: "You can only comment on your own tickets." });
    }

    const updated = await addComment(ticket.internalId, req.user.name, String(text).trim());
    res.status(201).json({ ticket: updated });
  })
);

app.patch(
  "/api/tickets/:id",
  authRequired,
  roleRequired("it"),
  wrap(async (req, res) => {
    const { status, assignee } = req.body || {};

    if (!status && typeof assignee === "undefined") {
      return res.status(400).json({ error: "Provide at least one field to update." });
    }

    if (status && !["Open", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ error: "Status must be Open, In Progress, or Resolved." });
    }

    if (typeof assignee !== "undefined" && assignee !== "") {
      const validStaff = await isValidStaffAssignee(assignee);
      if (!validStaff) {
        return res.status(400).json({ error: "Assignee must be a valid IT staff member." });
      }
    }

    const updated = await updateTicket(req.params.id, status, assignee);
    if (!updated) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    res.json({ ticket: updated });
  })
);

app.get("/api/debug/users", wrap(async (req, res) => {
  const result = await pool.query("SELECT id, name, email, role FROM users ORDER BY id");
  const count = result.rows.length;
  res.json({ count, users: result.rows });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
});

async function startServer() {
  try {
    console.log("Connecting to database...");
    console.log(`  Host: ${poolConfig.host || "via connectionString"}`);
    console.log(`  Database: ${poolConfig.database || "via connectionString"}`);
    console.log(`  User: ${poolConfig.user || "via connectionString"}`);
    
    await ensureDatabaseReady();
    console.log("Database ready, seeding complete.");
    
    app.listen(PORT, () => {
      console.log(`IT Ticketing App API running on http://localhost:${PORT}`);
      console.log(`Check users at: http://localhost:${PORT}/api/debug/users`);
    });
  } catch (error) {
    console.error("Failed to initialize database and start server:", error);
    process.exit(1);
  }
}

startServer();
