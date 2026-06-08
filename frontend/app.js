const state = {
  token: localStorage.getItem("it_ticketing_token") || "",
  user: null,
  tickets: [],
  knowledgeBaseArticles: [],
  itStaff: [],
  selectedTicketId: null,
  ticketSearch: "",
  kbSearch: ""
};

const API_BASE = location && location.protocol === "file:" ? "http://localhost:3000" : "";

const authPanelEl = document.getElementById("authPanel");
const appTopbarEl = document.getElementById("appTopbar");
const appLayoutEl = document.getElementById("appLayout");
const loginTabBtnEl = document.getElementById("loginTabBtn");
const registerTabBtnEl = document.getElementById("registerTabBtn");
const loginFormEl = document.getElementById("loginForm");
const registerFormEl = document.getElementById("registerForm");
const loginEmailEl = document.getElementById("loginEmail");
const loginPasswordEl = document.getElementById("loginPassword");
const registerNameEl = document.getElementById("registerName");
const registerEmailEl = document.getElementById("registerEmail");
const registerPasswordEl = document.getElementById("registerPassword");
const registerRoleEl = document.getElementById("registerRole");
const authMessageEl = document.getElementById("authMessage");
const userNameEl = document.getElementById("userName");
const userRoleEl = document.getElementById("userRole");
const logoutBtnEl = document.getElementById("logoutBtn");

const openCountEl = document.getElementById("openCount");
const highCountEl = document.getElementById("highCount");
const resolvedCountEl = document.getElementById("resolvedCount");
const resolutionRateEl = document.getElementById("resolutionRate");
const resolutionProgressEl = document.getElementById("resolutionProgress");
const resolutionProgressBarEl = document.getElementById("resolutionProgressBar");
const ticketListEl = document.getElementById("ticketList");
const ticketSearchEl = document.getElementById("ticketSearch");
const dashboardTimestampEl = document.getElementById("dashboardTimestamp");
const detailEmptyEl = document.getElementById("detailEmpty");
const detailContentEl = document.getElementById("detailContent");
const itStaffPanelEl = document.getElementById("itStaffPanel");
const itStaffListEl = document.getElementById("itStaffList");
const detailTitleEl = document.getElementById("detailTitle");
const detailBadgeEl = document.getElementById("detailBadge");
const detailMetaEl = document.getElementById("detailMeta");
const detailDescriptionEl = document.getElementById("detailDescription");
const detailAssigneeEl = document.getElementById("detailAssignee");
const commentListEl = document.getElementById("commentList");
const commentFormEl = document.getElementById("commentForm");
const commentInputEl = document.getElementById("commentInput");
const itControlsEl = document.getElementById("itControls");
const statusSelectEl = document.getElementById("statusSelect");
const assigneeSelectEl = document.getElementById("assigneeSelect");
const newTicketBtnEl = document.getElementById("newTicketBtn");
const ticketDialogEl = document.getElementById("ticketDialog");
const ticketFormEl = document.getElementById("ticketForm");
const ticketTitleEl = document.getElementById("ticketTitle");
const ticketDescriptionEl = document.getElementById("ticketDescription");
const ticketPriorityEl = document.getElementById("ticketPriority");
const cancelDialogEl = document.getElementById("cancelDialog");
const chatLogEl = document.getElementById("chatLog");
const chatFormEl = document.getElementById("chatForm");
const chatInputEl = document.getElementById("chatInput");
const kbSearchEl = document.getElementById("kbSearch");
const kbListEl = document.getElementById("kbList");
const scheduleDialogEl = document.getElementById("scheduleDialog");
const scheduleFormEl = document.getElementById("scheduleForm");
const scheduleRowsEl = document.getElementById("scheduleRows");
const addScheduleRowBtnEl = document.getElementById("addScheduleRowBtn");
const cancelScheduleDialogEl = document.getElementById("cancelScheduleDialog");
const scheduleDialogDescriptionEl = document.getElementById("scheduleDialogDescription");

const SCHEDULE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
let editingScheduleStaffId = null;

function formatDate(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createScheduleEditorRow(block = { day: "Monday", start: "09:00", end: "17:00" }) {
  const row = document.createElement("div");
  row.className = "schedule-editor-row";

  const daySelect = document.createElement("select");
  daySelect.name = "day";
  SCHEDULE_DAYS.forEach((day) => {
    const option = document.createElement("option");
    option.value = day;
    option.textContent = day;
    if (day === block.day) option.selected = true;
    daySelect.appendChild(option);
  });

  const startInput = document.createElement("input");
  startInput.name = "start";
  startInput.type = "time";
  startInput.value = block.start || "09:00";

  const endInput = document.createElement("input");
  endInput.name = "end";
  endInput.type = "time";
  endInput.value = block.end || "17:00";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-ghost";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", () => row.remove());

  row.appendChild(daySelect);
  row.appendChild(startInput);
  row.appendChild(endInput);
  row.appendChild(removeBtn);

  return row;
}

function getScheduleFromEditor() {
  const blocks = [];
  scheduleRowsEl.querySelectorAll(".schedule-editor-row").forEach((row) => {
    const day = row.querySelector("select[name='day']")?.value;
    const start = row.querySelector("input[name='start']")?.value;
    const end = row.querySelector("input[name='end']")?.value;

    if (day && start && end) {
      blocks.push({ day, start, end });
    }
  });
  return blocks;
}

function formatScheduleCalendar(schedule) {
  const dayBlocks = schedule.reduce((acc, block) => {
    if (!acc[block.day]) acc[block.day] = [];
    acc[block.day].push(`${block.start}–${block.end}`);
    return acc;
  }, {});

  return `
    <div class="schedule-calendar">
      ${SCHEDULE_DAYS.map((day) => {
        const blocks = dayBlocks[day] || [];
        const content = blocks.length ? blocks.map((item) => `<span>${item}</span>`).join("") : `<span><em>Off</em></span>`;
        return `<div class="calendar-day"><strong>${day.slice(0, 3)}</strong>${content}</div>`;
      }).join("")}
    </div>
  `;
}

function openScheduleDialog(staff) {
  editingScheduleStaffId = staff.id;
  clearDialogError();
  scheduleDialogDescriptionEl.textContent = `Update schedule for ${staff.name}.`;
  scheduleRowsEl.innerHTML = "";

  const schedule = Array.isArray(staff.schedule) ? staff.schedule : [];
  if (!schedule.length) {
    scheduleRowsEl.appendChild(createScheduleEditorRow());
  } else {
    schedule.forEach((block) => scheduleRowsEl.appendChild(createScheduleEditorRow(block)));
  }

  scheduleDialogEl.showModal();
}

function isEditableSchedule(staff) {
  return state.user?.role === "it_admin" || (state.user?.role === "it_staff" && state.user?.name === staff.name);
}

function setDialogError(message) {
  scheduleDialogDescriptionEl.textContent = message;
  scheduleDialogDescriptionEl.style.color = "#b34f56";
}

function clearDialogError() {
  scheduleDialogDescriptionEl.textContent = "Use the calendar editor to update availability by day and time.";
  scheduleDialogDescriptionEl.style.color = "";
}

function setDialogMessage(message) {
  scheduleDialogDescriptionEl.textContent = message;
  scheduleDialogDescriptionEl.style.color = "#566981";
}

function setAuthMessage(message, isError = false) {
  authMessageEl.textContent = message;
  authMessageEl.style.color = isError ? "#b34f56" : "#566981";
}

async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(API_BASE + path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function persistToken(token) {
  state.token = token;
  localStorage.setItem("it_ticketing_token", token);
}

function clearAuth() {
  state.token = "";
  state.user = null;
  state.tickets = [];
  state.selectedTicketId = null;
  localStorage.removeItem("it_ticketing_token");
}

function isItRole(role) {
  return ["it", "it_admin", "it_staff"].includes(role);
}

function applyAuthView() {
  const isAuthed = Boolean(state.user && state.token);
  const showStaffPanel = isAuthed && isItRole(state.user?.role);

  authPanelEl.classList.toggle("hidden", isAuthed);
  appTopbarEl.classList.toggle("hidden", !isAuthed);
  appLayoutEl.classList.toggle("hidden", !isAuthed);
  itStaffPanelEl.classList.toggle("hidden", !showStaffPanel);

  if (isAuthed) {
    userNameEl.textContent = state.user.name;
    if (state.user.role === "it_admin") {
      userRoleEl.textContent = "IT Admin";
    } else if (state.user.role === "it_staff") {
      userRoleEl.textContent = "IT Staff";
    } else {
      userRoleEl.textContent = "Employee";
    }
  }
}

function getFilteredTickets() {
  const query = state.ticketSearch.trim().toLowerCase();
  if (!query) return state.tickets;

  return state.tickets.filter((ticket) =>
    [ticket.id, ticket.title, ticket.requester].some((text) => String(text).toLowerCase().includes(query))
  );
}

function getBadgeClass(ticket) {
  if (ticket.status === "Resolved") return "badge resolved";
  if (ticket.priority === "High") return "badge high";
  if (ticket.priority === "Medium") return "badge medium";
  return "badge low";
}

function updateDashboard() {
  const open = state.tickets.filter((t) => t.status !== "Resolved").length;
  const high = state.tickets.filter((t) => t.priority === "High" && t.status !== "Resolved").length;
  const resolved = state.tickets.filter((t) => t.status === "Resolved").length;
  const total = state.tickets.length;
  const rate = total ? Math.round((resolved / total) * 100) : 0;

  openCountEl.textContent = String(open);
  highCountEl.textContent = String(high);
  resolvedCountEl.textContent = String(resolved);
  resolutionRateEl.textContent = `${rate}%`;
  resolutionProgressEl.setAttribute("aria-valuenow", String(rate));
  resolutionProgressBarEl.style.width = `${rate}%`;
  dashboardTimestampEl.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function renderTicketList() {
  const filtered = getFilteredTickets();
  ticketListEl.innerHTML = "";

  if (filtered.length === 0) {
    ticketListEl.innerHTML = '<div class="empty-state">No tickets available yet.</div>';
    return;
  }

  filtered
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((ticket) => {
      const item = document.createElement("article");
      item.className = `ticket-item ${ticket.id === state.selectedTicketId ? "active" : ""}`;
      item.innerHTML = `
        <div class="ticket-title-row">
          <h3>${ticket.title}</h3>
          <span class="${getBadgeClass(ticket)}">${ticket.status === "Resolved" ? "Resolved" : ticket.priority}</span>
        </div>
        <p class="ticket-meta">${ticket.id} • ${ticket.requester} • ${ticket.status}</p>
      `;
      item.addEventListener("click", () => {
        state.selectedTicketId = ticket.id;
        renderTicketList();
        renderTicketDetail();
      });
      ticketListEl.appendChild(item);
    });
}

function renderComments(ticket) {
  commentListEl.innerHTML = "";

  if (!ticket.comments.length) {
    commentListEl.innerHTML = '<div class="empty-state">No comments yet.</div>';
    return;
  }

  ticket.comments.forEach((comment) => {
    const item = document.createElement("div");
    item.className = "comment";
    item.innerHTML = `
      <div class="comment-author">${comment.author}</div>
      <p>${comment.text}</p>
    `;
    commentListEl.appendChild(item);
  });
}

function renderTicketDetail() {
  const ticket = state.tickets.find((t) => t.id === state.selectedTicketId);

  if (!ticket) {
    detailEmptyEl.classList.remove("hidden");
    detailContentEl.classList.add("hidden");
    return;
  }

  detailEmptyEl.classList.add("hidden");
  detailContentEl.classList.remove("hidden");

  detailTitleEl.textContent = `${ticket.id} - ${ticket.title}`;
  detailBadgeEl.className = getBadgeClass(ticket);
  detailBadgeEl.textContent = ticket.status === "Resolved" ? "Resolved" : `${ticket.priority} Priority`;
  detailMetaEl.textContent = `Requester: ${ticket.requester} • Created: ${formatDate(ticket.createdAt)} • Status: ${ticket.status}`;
  detailDescriptionEl.textContent = ticket.description;
  detailAssigneeEl.textContent = ticket.assignee === "Unassigned" ? "Unassigned" : `Assigned to ${ticket.assignee}`;

  statusSelectEl.value = ticket.status;
  renderAssigneeSelect(ticket.assignee);
  itControlsEl.classList.toggle("hidden", !isItRole(state.user.role));

  renderComments(ticket);
}

function botReply(message) {
  const text = message.toLowerCase();

  if (text.includes("vpn")) {
    return "Try this quick flow: reconnect network, restart VPN client, then open the Networking article in the knowledge base.";
  }
  if (text.includes("password") || text.includes("mfa")) {
    return "Use the MFA reset knowledge article first. If still blocked, open a high-priority access ticket.";
  }
  if (text.includes("printer")) {
    return "Run the Self-Service Printer Recovery Guide, then create a ticket if the queue remains offline.";
  }
  return "I can help with VPN, login, printer, email, and software access. Describe the issue and I will suggest next steps.";
}

function appendChatBubble(text, type) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${type}`;
  bubble.textContent = text;
  chatLogEl.appendChild(bubble);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}

function renderKnowledgeBase() {
  const query = state.kbSearch.trim().toLowerCase();
  const filtered = state.knowledgeBaseArticles.filter((article) =>
    [article.title, article.body, article.tag].some((text) => text.toLowerCase().includes(query))
  );

  kbListEl.innerHTML = "";

  if (!filtered.length) {
    kbListEl.innerHTML = '<div class="empty-state">No articles found for your search.</div>';
    return;
  }

  filtered.forEach((article) => {
    const card = document.createElement("article");
    card.className = "kb-card";
    card.innerHTML = `
      <h3>${article.title}</h3>
      <p>${article.body}</p>
      <span class="kb-tag">${article.tag}</span>
    `;
    kbListEl.appendChild(card);
  });
}

function formatSchedule(schedule) {
  if (!Array.isArray(schedule) || !schedule.length) {
    return "No schedule defined";
  }
  return schedule.map((block) => `${block.day} ${block.start}-${block.end}`).join(" · ");
}

function renderStaffWorkload() {
  itStaffListEl.innerHTML = "";

  if (!state.itStaff.length) {
    itStaffListEl.innerHTML = '<div class="empty-state">Staff availability and workload are visible to IT users only.</div>';
    return;
  }

  state.itStaff.forEach((staff) => {
    const roleLabel = staff.role === "it_admin" ? "IT Admin" : "IT Staff";
    const canEdit = isEditableSchedule(staff);

    const card = document.createElement("article");
    card.className = "kb-card";
    card.innerHTML = `
      <div class="staff-card-head">
        <div>
          <h3>${staff.name}</h3>
          <p class="subtle">${roleLabel}</p>
        </div>
        <div>
          <span class="badge ${staff.loadRatio >= 1 ? "high" : staff.openTickets === 0 ? "resolved" : "medium"}">${staff.openTickets} open</span>
          ${canEdit ? `<button type="button" class="btn-secondary edit-schedule-btn">Edit Schedule</button>` : ""}
        </div>
      </div>
      <p class="subtle">Capacity: ${staff.capacity}</p>
      <p class="subtle">Available soon: ${staff.availableNext48Hours ? "Yes" : "No"}</p>
      <div class="schedule-block">
        <strong>Schedule</strong>
        ${formatScheduleCalendar(Array.isArray(staff.schedule) ? staff.schedule : [])}
      </div>
    `;

    if (canEdit) {
      card.querySelector(".edit-schedule-btn").addEventListener("click", () => openScheduleDialog(staff));
    }

    itStaffListEl.appendChild(card);
  });
}

function renderAssigneeSelect(selectedAssignee) {
  const staffOptions = state.itStaff.filter((staff) => staff.role === "it_staff");
  assigneeSelectEl.innerHTML = '<option value="">Unassigned</option>';

  staffOptions.forEach((staff) => {
    const selected = staff.name === selectedAssignee ? "selected" : "";
    const option = document.createElement("option");
    option.value = staff.name;
    option.textContent = `${staff.name} (${formatSchedule(staff.schedule)})`;
    if (selected) option.selected = true;
    assigneeSelectEl.appendChild(option);
  });
}

async function loadAppData() {
  const [ticketData, kbData] = await Promise.all([
    apiRequest("/api/tickets"),
    apiRequest("/api/knowledge")
  ]);
  let staffData = null;

  if (isItRole(state.user?.role)) {
    staffData = await apiRequest("/api/staff");
  }

  state.tickets = ticketData.tickets;
  state.knowledgeBaseArticles = kbData.knowledgeBase;
  state.itStaff = staffData?.staff || [];
  if (!state.selectedTicketId && state.tickets.length) {
    state.selectedTicketId = state.tickets[0].id;
  }
  if (state.selectedTicketId && !state.tickets.some((t) => t.id === state.selectedTicketId)) {
    state.selectedTicketId = state.tickets[0] ? state.tickets[0].id : null;
  }

  updateDashboard();
  renderTicketList();
  renderTicketDetail();
  renderKnowledgeBase();
  renderStaffWorkload();
}

async function login(email, password) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  persistToken(data.token);
  state.user = data.user;
  applyAuthView();
  await loadAppData();
  setAuthMessage("");
}

async function register(name, email, password, role) {
  const data = await apiRequest("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, role })
  });

  persistToken(data.token);
  state.user = data.user;
  applyAuthView();
  await loadAppData();
  setAuthMessage("");
}

async function restoreSession() {
  if (!state.token) {
    applyAuthView();
    return;
  }

  try {
    const profile = await apiRequest("/api/auth/me");
    state.user = profile.user;
    applyAuthView();
    await loadAppData();
  } catch (_error) {
    clearAuth();
    applyAuthView();
  }
}

loginTabBtnEl.addEventListener("click", () => {
  loginFormEl.classList.remove("hidden");
  registerFormEl.classList.add("hidden");
  loginTabBtnEl.classList.add("active-tab");
  registerTabBtnEl.classList.remove("active-tab");
  setAuthMessage("");
});

registerTabBtnEl.addEventListener("click", () => {
  registerFormEl.classList.remove("hidden");
  loginFormEl.classList.add("hidden");
  registerTabBtnEl.classList.add("active-tab");
  loginTabBtnEl.classList.remove("active-tab");
  setAuthMessage("");
});

loginFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await login(loginEmailEl.value.trim(), loginPasswordEl.value);
    loginFormEl.reset();
  } catch (error) {
    setAuthMessage(error.message, true);
  }
});

registerFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await register(
      registerNameEl.value.trim(),
      registerEmailEl.value.trim(),
      registerPasswordEl.value,
      registerRoleEl.value
    );
    registerFormEl.reset();
  } catch (error) {
    setAuthMessage(error.message, true);
  }
});

logoutBtnEl.addEventListener("click", () => {
  clearAuth();
  applyAuthView();
  setAuthMessage("You have been signed out.");
});

ticketSearchEl.addEventListener("input", (event) => {
  state.ticketSearch = event.target.value;
  renderTicketList();
});

commentFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = commentInputEl.value.trim();
  if (!text || !state.selectedTicketId) return;

  try {
    await apiRequest(`/api/tickets/${state.selectedTicketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text })
    });
    commentInputEl.value = "";
    await loadAppData();
  } catch (error) {
    alert(error.message);
  }
});

itControlsEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedTicketId) return;

  try {
    await apiRequest(`/api/tickets/${state.selectedTicketId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: statusSelectEl.value,
        assignee: assigneeSelectEl.value
      })
    });
    await loadAppData();
  } catch (error) {
    alert(error.message);
  }
});

newTicketBtnEl.addEventListener("click", () => {
  ticketDialogEl.showModal();
});

cancelDialogEl.addEventListener("click", () => {
  ticketDialogEl.close();
});

cancelScheduleDialogEl.addEventListener("click", () => {
  scheduleDialogEl.close();
  clearDialogError();
});

addScheduleRowBtnEl.addEventListener("click", () => {
  scheduleRowsEl.appendChild(createScheduleEditorRow());
});

scheduleFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const blocks = getScheduleFromEditor();

  if (!blocks.length) {
    setDialogError("Add at least one schedule row before saving.");
    return;
  }

  const invalidBlock = blocks.find((block) => !block.day || !block.start || !block.end || block.start >= block.end);
  if (invalidBlock) {
    setDialogError("Please use valid day and time ranges for all schedule rows.");
    return;
  }

  try {
    await apiRequest(`/api/staff/${editingScheduleStaffId}/schedule`, {
      method: "PATCH",
      body: JSON.stringify({ schedule: blocks })
    });
    scheduleDialogEl.close();
    clearDialogError();
    await loadAppData();
  } catch (error) {
    setDialogError(error.message || "Unable to save schedule.");
  }
});

ticketFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await apiRequest("/api/tickets", {
      method: "POST",
      body: JSON.stringify({
        title: ticketTitleEl.value.trim(),
        description: ticketDescriptionEl.value.trim(),
        priority: ticketPriorityEl.value
      })
    });
    ticketFormEl.reset();
    ticketDialogEl.close();
    await loadAppData();
  } catch (error) {
    alert(error.message);
  }
});

chatFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const userMessage = chatInputEl.value.trim();
  if (!userMessage) return;

  appendChatBubble(userMessage, "user");
  appendChatBubble(botReply(userMessage), "bot");
  chatInputEl.value = "";
});

kbSearchEl.addEventListener("input", (event) => {
  state.kbSearch = event.target.value;
  renderKnowledgeBase();
});

function init() {
  appendChatBubble("Hi, I am the IT Ticketing Assistant. Ask me anything about common IT issues.", "bot");
  applyAuthView();
  restoreSession();
}

init();
