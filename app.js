'use strict';
const STORAGE_KEY = 'cyberhub.workspace.v1';
const PIN_KEY = 'cyberhub.pin.v1';
const GIST_KEY = 'cyberhub.gist.id';
const categories = ['All', 'Labs', 'Bug Bounty', 'Networking', 'Portfolio'];
const $ = selector => document.querySelector(selector);
const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const uid = () => crypto.randomUUID();
const defaults = () => ({ version: 1, platforms: [
  ['TryHackMe', 'THM', 'Labs', 'https://tryhackme.com/', 'Learn by doing. Guided rooms, learning paths and real-world challenges.', '#f87171'],
  ['Hack The Box', 'HTB', 'Labs', 'https://www.hackthebox.com/', 'Challenge your skills with machines, labs and offensive security practice.', '#a3e635'],
  ['LetsDefend', 'LD', 'Labs', 'https://letsdefend.io/', 'Investigate alerts and build your blue-team skills in a simulated SOC.', '#60a5fa'],
  ['OverTheWire', 'OTW', 'Labs', 'https://overthewire.org/wargames/', 'Master Linux and security fundamentals, one wargame at a time.', '#fbbf24'],
  ['HackerOne', 'H1', 'Bug Bounty', 'https://www.hackerone.com/', 'Find your next program. Research vulnerabilities and report responsibly.', '#c4b5fd'],
  ['Bugcrowd', 'BC', 'Bug Bounty', 'https://www.bugcrowd.com/', 'Explore programs and grow your ethical hacking experience.', '#fb923c'],
  ['LinkedIn', 'in', 'Portfolio', 'https://www.linkedin.com/', 'Build your professional network and discover your next career move.', '#38bdf8'],
  ['GitHub', 'GH', 'Portfolio', 'https://github.com/', 'Showcase your projects, collaborate and share what you build.', '#d1d5db'],
  ['Credly', 'CR', 'Portfolio', 'https://www.credly.com/', 'Collect your credentials and share your verified achievements.', '#f59e0b'],
  ['Medium', 'M', 'Portfolio', 'https://medium.com/', 'Document your learning with write-ups, walkthroughs and research.', '#34d399']
].map(([name, icon, category, url, description, color]) => ({ id: uid(), name, icon, category, url, description, color, username: '', rank: '', notes: '', status: 'Learning' })), certifications: [
  ['Cisco CCNA', 'NETWORKING', ['Network fundamentals', 'Network access & VLANs', 'IP connectivity & routing', 'IP services', 'Security fundamentals', 'Automation & programmability']],
  ['CompTIA Security+', 'FOUNDATIONS', ['General security concepts', 'Threats & vulnerabilities', 'Security architecture', 'Security operations', 'Security program management']],
  ['eJPT', 'OFFENSIVE SECURITY', ['Assessment methodology', 'Host & network auditing', 'Host & network penetration testing', 'Web application penetration testing']],
  ['OSCP', 'ADVANCED PRACTICE', ['Information gathering', 'Vulnerability analysis', 'Web application attacks', 'Privilege escalation', 'Active Directory', 'Reporting & practice labs']]
].map(([name, tag, modules]) => ({ id: uid(), name, tag, targetDate: '', modules: modules.map(title => ({ id: uid(), title, done: false })) })), tasks: [] });

function safeURL(value) {
  try { const parsed = new URL(value); return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password ? parsed.href : null; } catch { return null; }
}
function isDate(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d = new Date(`${value}T12:00:00`); return !Number.isNaN(d.getTime()) && localDate(d) === value; }
function validateState(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.platforms) || !Array.isArray(input.certifications) || !Array.isArray(input.tasks)) throw new Error('This is not a CyberHub v1 backup.');
  if (input.platforms.length > 500 || input.certifications.length > 100 || input.tasks.length > 10000) throw new Error('This backup exceeds the workspace limits.');
  const str = (v, max = 2000) => { if (typeof v !== 'string' || v.length > max) throw new Error('The backup contains an invalid field.'); return v; };
  const ids = new Set();
  const id = v => { const s = str(v, 100); if (!s || ids.has(s)) throw new Error('The backup contains duplicate or empty IDs.'); ids.add(s); return s; };
  return { version: 1, platforms: input.platforms.map(p => {
    if (!safeURL(p.url) || !categories.slice(1).includes(p.category) || !['Learning', 'Active', 'Paused'].includes(p.status) || !/^#[0-9a-f]{6}$/i.test(p.color)) throw new Error('The backup contains an invalid platform.');
    return { id: id(p.id), name: str(p.name, 80), icon: str(p.icon, 4), category: p.category, url: safeURL(p.url), description: str(p.description, 300), color: p.color, username: str(p.username, 100), rank: str(p.rank, 80), notes: str(p.notes), status: p.status };
  }), certifications: input.certifications.map(c => {
    if (!Array.isArray(c.modules) || c.modules.length > 100 || (c.targetDate && !isDate(c.targetDate))) throw new Error('The backup contains an invalid roadmap.');
    return { id: id(c.id), name: str(c.name, 100), tag: str(c.tag, 60), targetDate: c.targetDate || '', modules: c.modules.map(m => { if (typeof m.done !== 'boolean') throw new Error('Invalid module status.'); return { id: id(m.id), title: str(m.title, 200), done: m.done }; }) };
  }), tasks: input.tasks.map(t => { if (!isDate(t.date) || !['High', 'Normal', 'Low'].includes(t.priority) || typeof t.done !== 'boolean') throw new Error('The backup contains an invalid task.'); return { id: id(t.id), title: str(t.title, 180), priority: t.priority, date: t.date, done: t.done }; }) };
}
let state;
let initialError = '';
try { const raw = localStorage.getItem(STORAGE_KEY); state = raw ? validateState(JSON.parse(raw)) : defaults(); } catch { state = defaults(); initialError = 'Saved data could not be read. Your original storage has not been overwritten. Restore a JSON backup if needed.'; }
let activeCategory = 'All';
let taskDate = localDate();
let currentTab = 'platforms';
let editorSave;
let toastTimer;
let installPrompt;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5500); }
function persist(next = state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); state = next; renderStats(); return true; } catch { toast('Could not save. Browser storage may be full or unavailable. Export a backup before closing.'); return false; }
}
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function button(text, className, action) { const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node; }
function studyStreak() {
  const dates = new Set(state.tasks.filter(t => t.done && t.date <= localDate()).map(t => t.date));
  const date = new Date(); date.setHours(12, 0, 0, 0);
  if (!dates.has(localDate(date))) date.setDate(date.getDate() - 1);
  let n = 0; while (dates.has(localDate(date))) { n++; date.setDate(date.getDate() - 1); } return n;
}
function renderStats() {
  const todayTasks = state.tasks.filter(t => t.date === localDate());
  $('#platform-count').textContent = state.platforms.length;
  $('#stat-platforms').replaceChildren(document.createTextNode(`${state.platforms.length} `), el('small', '', 'ready to explore'));
  $('#stat-certs').replaceChildren(document.createTextNode(`${state.certifications.length} `), el('small', '', 'on your roadmap'));
  $('#stat-tasks').replaceChildren(document.createTextNode(`${todayTasks.filter(t => t.done).length} / ${todayTasks.length} `), el('small', '', 'tasks complete'));
  const streak = studyStreak(); $('#streak').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
}
function renderPlatforms() {
  const query = $('#search').value.toLowerCase().trim();
  const platforms = state.platforms.filter(p => (activeCategory === 'All' || p.category === activeCategory) && [p.name, p.description, p.username, p.rank, p.notes, p.category].some(v => v.toLowerCase().includes(query)));
  $('#platform-heading').firstChild.textContent = activeCategory === 'All' ? 'All platforms ' : `${activeCategory} `;
  $('#result-count').textContent = platforms.length;
  $('#platform-empty').hidden = platforms.length > 0;
  $('#platform-grid').replaceChildren(...platforms.map(p => {
    const card = el('article', 'platform-card'); card.style.setProperty('--accent', p.color);
    const top = el('div', 'card-top'); const edit = button('···', 'icon-button card-edit', () => editPlatform(p)); edit.setAttribute('aria-label', `Edit ${p.name}`);
    top.append(el('span', 'platform-logo', p.icon || p.name.slice(0, 2).toUpperCase()), edit);
    const meta = el('div', 'card-meta'); meta.append(el('span', 'badge', p.category.toUpperCase()));
    if (p.username) meta.append(el('span', 'profile', `@${p.username}`));
    const footer = el('div', 'card-footer'); const launch = el('a', 'launch', 'Launch platform ↗'); launch.href = p.url; launch.target = '_blank'; launch.rel = 'noopener noreferrer';
    footer.append(el('span', 'progress-text', p.rank || p.status), launch);
    card.append(top, el('h3', '', p.name), el('p', 'description', p.description), meta, footer); return card;
  }));
}
function field(label, name, value = '', options = {}) {
  const wrap = el('label', '', label); const input = el(options.multiline ? 'textarea' : options.options ? 'select' : 'input');
  input.name = name;
  if (options.options) for (const choice of options.options) { const option = el('option', '', choice); option.value = choice; input.append(option); }
  else if (!options.multiline) input.type = options.type || 'text';
  input.value = value; if (options.required) input.required = true; if (options.max) input.maxLength = options.max; if (options.pattern) input.pattern = options.pattern;
  if (options.placeholder) input.placeholder = options.placeholder;
  wrap.append(input); return wrap;
}
function openEditor(title, fields, onSave) { $('#editor-title').textContent = title; $('#editor-fields').replaceChildren(...fields); editorSave = onSave; $('#editor').showModal(); }
function editPlatform(platform) {
  const p = platform || { name: '', url: '', icon: '', category: 'Labs', status: 'Learning', username: '', rank: '', description: '', notes: '', color: '#00e6ee' };
  const fields = [field('Platform name', 'name', p.name, { required: true, max: 80 }), field('Website or profile URL', 'url', p.url, { type: 'url', required: true, placeholder: 'https://…' }), field('Category', 'category', p.category, { options: categories.slice(1) }), field('Short icon (up to 4 characters)', 'icon', p.icon, { max: 4 }), field('Description', 'description', p.description, { max: 300 }), field('Username', 'username', p.username, { max: 100 }), field('Rank / points / badge', 'rank', p.rank, { max: 80 }), field('Status', 'status', p.status, { options: ['Learning', 'Active', 'Paused'] }), field('Notes', 'notes', p.notes, { multiline: true, max: 2000 })];
  if (platform) fields.push(button('Remove platform', 'button danger', () => { if (confirm(`Remove ${p.name} from your workspace?`)) { const next = structuredClone(state); next.platforms = next.platforms.filter(x => x.id !== p.id); if (persist(next)) { $('#editor').close(); renderPlatforms(); } } }));
  openEditor(platform ? `Edit ${p.name}` : 'Add platform', fields, values => {
    const url = safeURL(values.url); if (!url) throw new Error('Enter a valid HTTP or HTTPS URL without embedded credentials.'); if (!values.name.trim()) throw new Error('Enter a platform name.');
    const item = { ...p, ...values, id: p.id || uid(), name: values.name.trim(), url, icon: values.icon.trim() || values.name.slice(0, 2).toUpperCase() };
    const next = structuredClone(state); if (platform) next.platforms = next.platforms.map(x => x.id === p.id ? item : x); else { if (next.platforms.length >= 500) throw new Error('The workspace limit is 500 platforms.'); next.platforms.push(item); }
    if (!persist(next)) return false; renderPlatforms(); return true;
  });
}
function renderCerts() {
  $('#cert-grid').replaceChildren(...state.certifications.map(c => {
    const card = el('article', 'panel'); const title = el('div', 'cert-title'); const titleText = el('div'); titleText.append(el('span', 'badge cyan', c.tag), el('h2', '', c.name)); const edit = button('···', 'icon-button', () => editCert(c)); edit.setAttribute('aria-label', `Edit ${c.name}`); title.append(titleText, edit);
    const done = c.modules.filter(m => m.done).length; const percent = c.modules.length ? Math.round(done / c.modules.length * 100) : 0;
    const progress = el('div', 'progress-bar'); const fill = el('span'); fill.style.width = `${percent}%`; progress.append(fill); progress.setAttribute('role', 'progressbar'); progress.setAttribute('aria-label', `${c.name} progress`); progress.setAttribute('aria-valuenow', percent); progress.setAttribute('aria-valuemin', '0'); progress.setAttribute('aria-valuemax', '100');
    const stats = el('div', 'cert-stats'); let countdown = 'Set your exam date';
    if (c.targetDate) { const days = Math.round((new Date(`${c.targetDate}T12:00:00`) - new Date(`${localDate()}T12:00:00`)) / 86400000); countdown = days > 0 ? `${days} days to target` : days === 0 ? 'Target date is today' : `${Math.abs(days)} days past target`; }
    stats.append(el('span', 'cyan', `${percent}% · ${done}/${c.modules.length} modules`), el('span', '', countdown));
    const list = el('div', 'checklist'); for (const m of c.modules) { const row = el('label', `check-row${m.done ? ' completed' : ''}`); const check = el('input'); check.type = 'checkbox'; check.checked = m.done; check.addEventListener('change', () => { const next = structuredClone(state); next.certifications.find(x => x.id === c.id).modules.find(x => x.id === m.id).done = check.checked; persist(next); renderCerts(); }); row.append(check, el('span', '', m.title)); list.append(row); }
    card.append(title, progress, stats, list); return card;
  })); if (!state.certifications.length) $('#cert-grid').append(el('p', 'empty', 'Add a certification to start your roadmap.'));
}
function editCert(cert) {
  const c = cert || { name: '', tag: 'MY ROADMAP', targetDate: '', modules: [] };
  const fields = [field('Certification name', 'name', c.name, { required: true, max: 100 }), field('Focus area', 'tag', c.tag, { max: 60 }), field('Target exam date', 'targetDate', c.targetDate, { type: 'date' }), field('Modules (one per line; matching titles keep their progress)', 'modules', c.modules.map(m => m.title).join('\n'), { multiline: true, required: true })];
  if (cert) fields.push(button('Remove certification', 'button danger', () => { if (confirm(`Remove ${c.name} and its progress?`)) { const next = structuredClone(state); next.certifications = next.certifications.filter(x => x.id !== c.id); if (persist(next)) { $('#editor').close(); renderCerts(); } } }));
  openEditor(cert ? `Edit ${c.name}` : 'Add certification', fields, values => {
    const titles = [...new Set(values.modules.split('\n').map(v => v.trim()).filter(Boolean))];
    if (!values.name.trim() || !titles.length || titles.length > 100 || titles.some(t => t.length > 200) || (values.targetDate && !isDate(values.targetDate))) throw new Error('Enter a name, a valid date and 1–100 modules, each under 200 characters.');
    const next = structuredClone(state); const item = { id: c.id || uid(), name: values.name.trim(), tag: values.tag.toUpperCase(), targetDate: values.targetDate, modules: titles.map(title => c.modules.find(m => m.title === title) || { id: uid(), title, done: false }) };
    if (cert) next.certifications = next.certifications.map(x => x.id === c.id ? item : x); else { if (next.certifications.length >= 100) throw new Error('The workspace limit is 100 certifications.'); next.certifications.push(item); }
    if (!persist(next)) return false; renderCerts(); return true;
  });
}
function renderTasks() {
  const order = { High: 0, Normal: 1, Low: 2 }; const tasks = state.tasks.filter(t => t.date === taskDate).sort((a, b) => Number(a.done) - Number(b.done) || order[a.priority] - order[b.priority]);
  $('#task-list').replaceChildren(...tasks.map(t => {
    const row = el('div', `task-row${t.done ? ' completed' : ''}`); const check = el('input'); check.type = 'checkbox'; check.checked = t.done; check.setAttribute('aria-label', `Complete ${t.title}`);
    check.addEventListener('change', () => { const next = structuredClone(state); next.tasks.find(x => x.id === t.id).done = check.checked; persist(next); renderTasks(); });
    const remove = button('×', 'icon-button', () => { if (confirm(`Remove task “${t.title}”?`)) { const next = structuredClone(state); next.tasks = next.tasks.filter(x => x.id !== t.id); persist(next); renderTasks(); } }); remove.setAttribute('aria-label', `Remove ${t.title}`);
    row.append(check, el('span', 'task-title', t.title), el('span', `badge ${t.priority.toLowerCase()}`, t.priority.toUpperCase()), remove); return row;
  })); if (!tasks.length) $('#task-list').append(el('p', 'empty', 'A clear log. Add one small step to move forward.'));
}
function renderAll() { renderStats(); renderPlatforms(); renderCerts(); renderTasks(); }
function switchTab(tab) {
  if (!['platforms', 'certifications', 'tasks', 'sync'].includes(tab)) tab = 'platforms'; currentTab = tab;
  document.querySelectorAll('.view').forEach(node => { node.hidden = node.id !== `view-${tab}`; });
  document.querySelectorAll('[data-tab]').forEach(link => { link.classList.toggle('active', link.dataset.tab === tab); if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  const labels = { platforms: ['Platforms & Labs', 'Your cyber command center', 'One workspace. Every platform. Keep building your edge.'], certifications: ['Cert Roadmaps', 'Turn ambition into credentials', 'Break down your roadmap. Track every milestone.'], tasks: ['Daily Lab Log', 'Consistency is your advantage', 'Make time for practice. Build a streak that matters.'], sync: ['Sync & Backup', 'Your progress, wherever you go', 'Keep a backup. Move between devices with confidence.'] };
  $('#breadcrumb').textContent = labels[tab][0]; $('#page-title').replaceChildren(document.createTextNode(labels[tab][1]), el('span', 'cyan', '.')); $('#page-description').textContent = labels[tab][2]; $('#add-platform').hidden = tab !== 'platforms'; $('#sidebar').classList.remove('open'); $('#menu-button').setAttribute('aria-expanded', 'false');
}
function downloadBackup() { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = el('a'); a.href = url; a.download = `cyberhub-backup-${localDate()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Backup downloaded.'); }
async function loadBackup(file) {
  if (!file) return; if (file.size > 5 * 1024 * 1024) throw new Error('Choose a JSON backup smaller than 5 MB.');
  const incoming = validateState(JSON.parse(await file.text()));
  if (!confirm(`Replace this browser's workspace with ${incoming.platforms.length} platforms, ${incoming.certifications.length} roadmaps and ${incoming.tasks.length} tasks? Export a backup first if you need your current data.`)) return;
  if (persist(incoming)) { renderAll(); toast('Backup restored.'); }
}
async function gistRequest(path, options = {}) {
  const token = $('#gist-token').value.trim(); if (!token) throw new Error('Enter your GitHub token. It is used only for this session.');
  const response = await fetch(`https://api.github.com/gists${path}`, { ...options, headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!response.ok) throw new Error(response.status === 401 ? 'GitHub rejected the token. Check it and try again.' : response.status === 404 ? 'Gist not found or your token cannot access it.' : `GitHub request failed (${response.status}). Check the token's Gist permission and your connection.`);
  return response.json();
}
function gistId() { const value = $('#gist-id').value.trim(); if (value && !/^[a-f0-9]{5,64}$/i.test(value)) throw new Error('Enter only the Gist ID, not the full URL.'); return value; }
async function syncGist(direction) {
  const buttons = [$('#gist-upload'), $('#gist-download')]; buttons.forEach(b => { b.disabled = true; }); $('#sync-status').textContent = 'Connecting to GitHub…';
  try {
    const id = gistId();
    if (direction === 'upload') {
      if (id && !confirm('Replace the CyberHub data in this Gist with this device’s workspace?')) { $('#sync-status').textContent = 'Upload cancelled.'; return; }
      const body = { description: 'CyberHub workspace backup', files: { 'cyberhub.json': { content: JSON.stringify(state) } } }; if (!id) body.public = false;
      const result = await gistRequest(id ? `/${id}` : '', { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      $('#gist-id').value = result.id; try { localStorage.setItem(GIST_KEY, result.id); } catch {} $('#sync-status').textContent = 'Uploaded. Copy this Gist ID to your other device.';
    } else {
      if (!id) throw new Error('Enter the Gist ID from your other device.');
      const result = await gistRequest(`/${id}`); const file = result.files?.['cyberhub.json']; if (!file || file.truncated || !file.content) throw new Error('The Gist has no complete cyberhub.json backup. Use JSON export/import for large workspaces.');
      const incoming = validateState(JSON.parse(file.content)); if (!confirm(`Replace this device's workspace with the Gist backup (${incoming.platforms.length} platforms, ${incoming.tasks.length} tasks)? Export a backup first to keep current data.`)) { $('#sync-status').textContent = 'Download cancelled.'; return; }
      if (!persist(incoming)) throw new Error('The downloaded data could not be saved on this device.');
      try { localStorage.setItem(GIST_KEY, id); } catch {} renderAll(); $('#sync-status').textContent = 'Downloaded and saved on this device.';
    }
  } catch (error) { $('#sync-status').textContent = error.message; } finally { buttons.forEach(b => { b.disabled = false; }); }
}
async function pinDigest(pin, salt) { const bytes = new TextEncoder().encode(`${salt}:${pin}`); const digest = await crypto.subtle.digest('SHA-256', bytes); return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join(''); }
function readPin() { try { const pin = JSON.parse(localStorage.getItem(PIN_KEY)); return pin && typeof pin.salt === 'string' && /^[a-f0-9]{64}$/.test(pin.hash) ? pin : null; } catch { return null; } }
function lockWorkspace() { if (!readPin()) return; $('#lock-screen').hidden = false; document.body.classList.add('locked'); $('#gist-token').value = ''; $('#unlock-pin').value = ''; $('#unlock-error').textContent = ''; $('#editor').close(); $('#unlock-pin').focus(); }
function renderPin() { const configured = Boolean(readPin()); $('#lock-button').hidden = !configured; $('#configure-pin').textContent = configured ? 'Change or remove PIN' : 'Set PIN'; }
function configurePin() {
  const existing = readPin(); const fields = [];
  if (existing) fields.push(field('Current PIN', 'current', '', { type: 'password', required: true, max: 8, pattern: '[0-9]{4,8}' }));
  fields.push(field(existing ? 'New PIN (leave blank to remove lock)' : 'Choose a PIN (4–8 digits)', 'pin', '', { type: 'password', required: !existing, max: 8, pattern: '[0-9]{4,8}' }));
  fields.push(field('Confirm new PIN', 'confirmPin', '', { type: 'password', max: 8, pattern: '[0-9]{4,8}' }));
  openEditor('Workspace PIN', fields, async values => {
    if (existing && await pinDigest(values.current, existing.salt) !== existing.hash) throw new Error('The current PIN is incorrect.');
    if (values.pin !== values.confirmPin) throw new Error('The new PINs do not match.');
    if (!values.pin && existing) localStorage.removeItem(PIN_KEY); else { if (!/^[0-9]{4,8}$/.test(values.pin)) throw new Error('Use 4–8 digits.'); const salt = uid(); localStorage.setItem(PIN_KEY, JSON.stringify({ salt, hash: await pinDigest(values.pin, salt) })); }
    renderPin(); toast(values.pin ? 'PIN saved on this device.' : 'PIN removed.'); return true;
  });
}
for (const category of categories) { const filter = button(category === 'All' ? 'All platforms' : category, `filter${category === 'All' ? ' active' : ''}`, () => { activeCategory = category; document.querySelectorAll('.filter').forEach(b => { const on = b === filter; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); }); renderPlatforms(); }); filter.setAttribute('aria-pressed', String(category === 'All')); $('#filters').append(filter); }
$('#search').addEventListener('input', renderPlatforms);
$('#add-platform').addEventListener('click', () => editPlatform()); $('#add-cert').addEventListener('click', () => editCert());
$('#cancel-editor').addEventListener('click', () => $('#editor').close()); $('#close-editor').addEventListener('click', () => $('#editor').close());
$('#editor-form').addEventListener('submit', async event => { event.preventDefault(); const save = event.submitter; save.disabled = true; try { if (await editorSave(Object.fromEntries(new FormData(event.currentTarget)))) $('#editor').close(); } catch (error) { toast(error.message); } finally { save.disabled = false; } });
$('#task-date').value = taskDate; $('#task-date').addEventListener('change', event => { taskDate = isDate(event.target.value) ? event.target.value : localDate(); event.target.value = taskDate; renderTasks(); });
$('#task-form').addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); if (!data.title.trim()) return; if (state.tasks.length >= 10000) return toast('The workspace limit is 10,000 tasks.'); const next = structuredClone(state); next.tasks.push({ id: uid(), title: data.title.trim(), priority: data.priority, done: false, date: taskDate }); if (persist(next)) { event.currentTarget.reset(); renderTasks(); } });
$('#export').addEventListener('click', downloadBackup); $('#import').addEventListener('click', () => $('#import-file').click()); $('#import-file').addEventListener('change', async event => { try { await loadBackup(event.target.files[0]); } catch (error) { toast(`Restore failed: ${error.message}`); } event.target.value = ''; });
$('#gist-upload').addEventListener('click', () => syncGist('upload')); $('#gist-download').addEventListener('click', () => syncGist('download')); try { $('#gist-id').value = localStorage.getItem(GIST_KEY) || ''; } catch {}
$('#configure-pin').addEventListener('click', configurePin); $('#lock-button').addEventListener('click', lockWorkspace);
let pinFailures = 0; let retryAfter = 0;
$('#unlock-form').addEventListener('submit', async event => { event.preventDefault(); if (Date.now() < retryAfter) { $('#unlock-error').textContent = 'Please wait 30 seconds before trying again.'; return; } const pin = readPin(); if (!pin) { $('#unlock-error').textContent = 'The saved PIN is unavailable. Reload the app.'; return; } if (await pinDigest($('#unlock-pin').value, pin.salt) === pin.hash) { pinFailures = 0; $('#lock-screen').hidden = true; document.body.classList.remove('locked'); $('#unlock-pin').value = ''; $('#lock-button').focus(); } else { pinFailures++; if (pinFailures % 5 === 0) retryAfter = Date.now() + 30000; $('#unlock-error').textContent = 'Incorrect PIN. Please try again.'; $('#unlock-pin').value = ''; } });
$('#menu-button').addEventListener('click', () => { const open = $('#sidebar').classList.toggle('open'); $('#menu-button').setAttribute('aria-expanded', String(open)); });
document.querySelectorAll('[data-tab]').forEach(a => a.addEventListener('click', () => switchTab(a.dataset.tab))); window.addEventListener('hashchange', () => switchTab(location.hash.slice(1)));
document.addEventListener('keydown', event => { if (event.key === 'Escape') { $('#sidebar').classList.remove('open'); $('#menu-button').setAttribute('aria-expanded', 'false'); } });
function connection() { $('#connection').textContent = navigator.onLine ? 'SYSTEM ONLINE' : 'OFFLINE · LOCAL MODE'; } window.addEventListener('online', connection); window.addEventListener('offline', connection); connection();
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('#install-button').hidden = false; }); $('#install-button').addEventListener('click', async () => { if (installPrompt) { await installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#install-button').hidden = true; } }); window.addEventListener('appinstalled', () => { $('#install-button').hidden = true; toast('CyberHub installed.'); });
window.addEventListener('storage', event => { if (event.key === PIN_KEY) { renderPin(); if (readPin()) lockWorkspace(); else { $('#lock-screen').hidden = true; document.body.classList.remove('locked'); } } else if (event.key === STORAGE_KEY && event.newValue) { try { state = validateState(JSON.parse(event.newValue)); renderAll(); toast('Workspace updated from another tab.'); } catch {} } });
$('#today').textContent = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase();
renderAll(); renderPin(); switchTab(location.hash.slice(1)); if (readPin()) lockWorkspace(); if (initialError) toast(initialError);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => toast('Offline setup is unavailable. The app will still work while online.'));
