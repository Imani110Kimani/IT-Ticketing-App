const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const DB_PATH = path.join(__dirname, "data", "db.json");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function seedKnowledge() {
  return [
    {
      id: 1,
      title: "How to Reset MFA for Company Accounts",
      body: "Use the identity portal, select Security Info, then re-register your authenticator app in 3 steps.",
      tag: "Identity"
    },
    {
      id: 2,
      title: "Fixing VPN Connection and DNS Errors",
      body: "Check split tunneling profile, renew IP configuration, and restart secure tunnel service.",
      tag: "Networking"
    },
    {
      id: 3,
      title: "Outlook Sync Troubleshooting Checklist",
      body: "Verify mailbox size, sync interval, and focus assist rules on desktop and mobile.",
      tag: "Email"
    },
    {
      id: 4,
      title: "Self-Service Printer Recovery Guide",
      body: "Clear stale print jobs, reconnect to the queue, and validate print spooler status.",
      tag: "Hardware"
    },
    {
      id: 5,
      title: "Laptop Running Slow: First 10-Minute Fixes",
      body: "Close high-memory apps, run quick malware scan, and free startup processes.",
      tag: "Performance"
    },
    {
      id: 6,
      title: "Requesting Software Access or Licenses",
      body: "Submit a software request ticket with business reason and manager approval details.",
      tag: "Access"
    }
  ];
}

function seedTickets() {
  return [
    {
      id: "INC-4102",
      title: "VPN disconnects every 15 minutes",
      description: "Remote connection drops repeatedly when using corporate VPN on Windows laptop.",
      requester: "Jordan Kim",
      requesterId: 1,
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
      id: "INC-4105",
      title: "Printer on floor 4 is offline",
      description: "Finance team cannot print to printer FIN-4B despite network being available.",
      requester: "Maria Gomez",
      requesterId: 1,
      priority: "Medium",
      status: "Open",
      assignee: "Unassigned",
      createdAt: "2026-05-23T11:30:00",
      comments: [
        { author: "Maria Gomez", text: "Happening for everyone in our team.", createdAt: "2026-05-23T11:32:00" }
      ]
    },
    {
      id: "INC-4109",
      title: "Email sync delay on mobile",
      description: "Outlook mobile notifications are delayed by over 20 minutes.",
      requester: "Theo Wang",
      requesterId: 1,
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

function ensureDataFile() {
  if (fs.existsSync(DB_PATH)) {
    return;
  }

  const initialData = {
    users: [
      {
        id: 1,
        name: "IT Admin",
        email: "it@company.com",
        role: "it",
        passwordHash: bcrypt.hashSync("Passw0rd!", 10)
      },
      {
        id: 2,
        name: "Employee Demo",
        email: "employee@company.com",
        role: "employee",
        passwordHash: bcrypt.hashSync("Passw0rd!", 10)
      }
    ],
    tickets: seedTickets(),
    knowledgeBase: seedKnowledge(),
    counters: {
      user: 3,
      ticket: 4110
    }
  };

  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
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

function roleRequired(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Insufficient permissions." });
    }
    return next();
  };
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const normalizedRole = role === "it" ? "it" : "employee";
  const normalizedEmail = String(email).trim().toLowerCase();
  const db = readDb();

  if (db.users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const user = {
    id: db.counters.user,
    name: String(name).trim(),
    email: normalizedEmail,
    role: normalizedRole,
    passwordHash: bcrypt.hashSync(password, 10)
  };

  db.counters.user += 1;
  db.users.push(user);
  writeDb(db);

  return res.status(201).json({
    token: issueToken(user),
    user: sanitizeUser(user)
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const db = readDb();
  const user = db.users.find((item) => item.email === normalizedEmail);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  return res.json({
    token: issueToken(user),
    user: sanitizeUser(user)
  });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  const db = readDb();
  const user = db.users.find((item) => item.id === req.user.sub);

  if (!user) {
    return res.status(401).json({ error: "User not found." });
  }

  return res.json({ user: sanitizeUser(user) });
});

app.get("/api/knowledge", authRequired, (req, res) => {
  const db = readDb();
  res.json({ knowledgeBase: db.knowledgeBase });
});

app.get("/api/tickets", authRequired, (req, res) => {
  const db = readDb();

  if (req.user.role === "it") {
    return res.json({ tickets: db.tickets });
  }

  const visibleTickets = db.tickets.filter((ticket) =>
    ticket.requesterId === req.user.sub || ticket.comments.some((comment) => comment.author === req.user.name)
  );

  return res.json({ tickets: visibleTickets });
});

app.post("/api/tickets", authRequired, (req, res) => {
  const { title, description, priority } = req.body || {};

  if (!title || !description || !priority) {
    return res.status(400).json({ error: "Title, description, and priority are required." });
  }

  if (!["Low", "Medium", "High"].includes(priority)) {
    return res.status(400).json({ error: "Priority must be Low, Medium, or High." });
  }

  const db = readDb();
  const ticket = {
    id: `INC-${db.counters.ticket}`,
    title: String(title).trim(),
    description: String(description).trim(),
    requester: req.user.name,
    requesterId: req.user.sub,
    priority,
    status: "Open",
    assignee: "Unassigned",
    createdAt: new Date().toISOString(),
    comments: [
      {
        author: req.user.name,
        text: "Ticket submitted.",
        createdAt: new Date().toISOString()
      }
    ]
  };

  db.counters.ticket += 1;
  db.tickets.push(ticket);
  writeDb(db);

  res.status(201).json({ ticket });
});

app.post("/api/tickets/:id/comments", authRequired, (req, res) => {
  const { text } = req.body || {};

  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: "Comment text is required." });
  }

  const db = readDb();
  const ticket = db.tickets.find((item) => item.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  if (req.user.role !== "it" && ticket.requesterId !== req.user.sub) {
    return res.status(403).json({ error: "You can only comment on your own tickets." });
  }

  ticket.comments.push({
    author: req.user.name,
    text: String(text).trim(),
    createdAt: new Date().toISOString()
  });

  writeDb(db);
  res.status(201).json({ ticket });
});

app.patch("/api/tickets/:id", authRequired, roleRequired("it"), (req, res) => {
  const { status, assignee } = req.body || {};

  if (!status && typeof assignee === "undefined") {
    return res.status(400).json({ error: "Provide at least one field to update." });
  }

  if (status && !["Open", "In Progress", "Resolved"].includes(status)) {
    return res.status(400).json({ error: "Status must be Open, In Progress, or Resolved." });
  }

  const db = readDb();
  const ticket = db.tickets.find((item) => item.id === req.params.id);

  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found." });
  }

  if (status) {
    ticket.status = status;
    if (status === "Resolved") {
      ticket.comments.push({
        author: "System",
        text: "Ticket marked as resolved.",
        createdAt: new Date().toISOString()
      });
    }
  }

  if (typeof assignee !== "undefined") {
    const normalizedAssignee = String(assignee).trim();
    ticket.assignee = normalizedAssignee || "Unassigned";
  }

  writeDb(db);
  res.json({ ticket });
});

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`Nimbus API running on http://localhost:${PORT}`);
});
