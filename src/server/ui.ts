export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EnvDoctor — Developer Environment Diagnostics</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --heading: #f0f6fc;
      --primary: #58a6ff;
      --primary-hover: #388bfd;
      --success: #3fb950;
      --warning: #d29922;
      --danger: #f85149;
      --badge-pass: rgba(63, 185, 80, 0.15);
      --badge-warn: rgba(210, 153, 34, 0.15);
      --badge-fail: rgba(248, 81, 73, 0.15);
      --code-bg: #090d13;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); line-height: 1.5; padding: 0; }

    header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      padding: 16px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-icon { font-size: 26px; }
    .brand h1 { font-size: 18px; font-weight: 700; color: var(--heading); }
    .brand span { font-size: 12px; background: rgba(88, 166, 255, 0.2); color: var(--primary); padding: 2px 8px; border-radius: 12px; font-weight: 600; }

    .nav-actions { display: flex; gap: 10px; align-items: center; }
    button {
      background: #21262d;
      color: var(--heading);
      border: 1px solid var(--border);
      padding: 7px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    button:hover { background: #30363d; border-color: #8b949e; }
    button.primary { background: #238636; border-color: #2ea043; color: #fff; }
    button.primary:hover { background: #2ea043; }

    .container { max-width: 1200px; margin: 24px auto; padding: 0 20px; }

    /* Top Stats Row */
    .stats-grid {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }

    .score-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      border: 5px solid var(--success);
      font-size: 32px;
      font-weight: 800;
      color: var(--heading);
    }
    .score-rating { font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .stat-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .stat-title { font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
    .stat-val { font-size: 26px; font-weight: 700; color: var(--heading); }
    .stat-box.pass .stat-val { color: var(--success); }
    .stat-box.warn .stat-val { color: var(--warning); }
    .stat-box.fail .stat-val { color: var(--danger); }

    /* Filters & Controls */
    .controls-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
    }

    .tabs { display: flex; gap: 8px; }
    .tab {
      background: none;
      border: 1px solid transparent;
      color: var(--text-muted);
      padding: 6px 12px;
      border-radius: 6px;
    }
    .tab.active { background: #21262d; color: var(--heading); border-color: var(--border); font-weight: 600; }

    .search-box {
      background: var(--code-bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 13px;
      width: 260px;
    }
    .search-box:focus { outline: none; border-color: var(--primary); }

    /* Findings List */
    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 12px;
      transition: border-color 0.15s ease;
    }
    .finding-card:hover { border-color: #58a6ff44; }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }

    .finding-title-group { display: flex; align-items: center; gap: 10px; }
    .finding-title { font-size: 15px; font-weight: 600; color: var(--heading); }

    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-passed { background: var(--badge-pass); color: var(--success); border: 1px solid rgba(63, 185, 80, 0.4); }
    .badge-warning { background: var(--badge-warn); color: var(--warning); border: 1px solid rgba(210, 153, 34, 0.4); }
    .badge-failed { background: var(--badge-fail); color: var(--danger); border: 1px solid rgba(248, 81, 73, 0.4); }

    .category-tag {
      font-size: 11px;
      background: #21262d;
      color: #8b949e;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .finding-summary { color: #8b949e; font-size: 13px; margin-bottom: 10px; }

    .finding-remediation {
      background: var(--code-bg);
      border: 1px solid #21262d;
      border-left: 3px solid var(--primary);
      border-radius: 4px;
      padding: 10px 14px;
      margin-top: 10px;
      font-size: 13px;
    }
    .rem-title { font-weight: 600; color: var(--primary); margin-bottom: 4px; font-size: 12px; }
    .rem-item { color: #c9d1d9; margin-left: 14px; font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }

    /* Modal / Export Preview */
    #export-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(2px);
      align-items: center;
      justify-content: center;
      z-index: 200;
    }
    .modal-content {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      width: 700px;
      max-width: 90vw;
      padding: 20px;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .modal-title { font-size: 16px; font-weight: 600; color: var(--heading); }
    pre.export-pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      padding: 12px;
      border-radius: 6px;
      max-height: 400px;
      overflow-y: auto;
      font-size: 12px;
      font-family: ui-monospace, monospace;
      color: #8b949e;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="brand-icon">🩺</span>
      <h1>EnvDoctor</h1>
      <span>v1.0.0</span>
      <span style="background: rgba(63, 185, 80, 0.15); color: var(--success); margin-left: 6px;">LOCAL SECURE</span>
    </div>
    <div class="nav-actions">
      <button onclick="exportReport('markdown')">Export Markdown</button>
      <button onclick="exportReport('json')">Export JSON</button>
      <button class="primary" onclick="triggerScan()">↻ Re-run Diagnostics</button>
    </div>
  </header>

  <div class="container">
    <div class="stats-grid">
      <div class="score-card">
        <div class="score-circle" id="score-circle">--</div>
        <div class="score-rating" id="score-rating">Checking...</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">Zero Secrets Leaked</div>
      </div>
      <div class="summary-cards">
        <div class="stat-box">
          <div class="stat-title">Total Checks</div>
          <div class="stat-val" id="stat-total">0</div>
        </div>
        <div class="stat-box pass">
          <div class="stat-title">Passed Checks</div>
          <div class="stat-val" id="stat-passed">0</div>
        </div>
        <div class="stat-box warn">
          <div class="stat-title">Warnings</div>
          <div class="stat-val" id="stat-warning">0</div>
        </div>
        <div class="stat-box fail">
          <div class="stat-title">Failures</div>
          <div class="stat-val" id="stat-failed">0</div>
        </div>
      </div>
    </div>

    <div class="controls-row">
      <div class="tabs" id="category-tabs">
        <button class="tab active" onclick="filterCategory('all')">All</button>
        <button class="tab" onclick="filterCategory('runtime')">Runtimes</button>
        <button class="tab" onclick="filterCategory('environment')">Environment</button>
        <button class="tab" onclick="filterCategory('path')">PATH</button>
        <button class="tab" onclick="filterCategory('project')">Project</button>
        <button class="tab" onclick="filterCategory('git')">Git</button>
        <button class="tab" onclick="filterCategory('docker')">Docker</button>
        <button class="tab" onclick="filterCategory('ports')">Ports</button>
      </div>
      <input type="text" class="search-box" id="search-input" placeholder="Search diagnostics..." oninput="handleSearch()">
    </div>

    <div id="findings-container">
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        Loading diagnostics report...
      </div>
    </div>
  </div>

  <div id="export-modal">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title" id="export-modal-title">Export Preview</div>
        <button onclick="closeModal()">✕</button>
      </div>
      <pre class="export-pre" id="export-modal-pre"></pre>
      <div style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px;">
        <button onclick="copyExportText()">Copy to Clipboard</button>
        <button class="primary" onclick="closeModal()">Close</button>
      </div>
    </div>
  </div>

  <script>
    let reportData = null;
    let currentCategory = 'all';
    let searchQuery = '';

    function showStatus(text, isError = false) {
      const container = document.getElementById('findings-container');
      container.replaceChildren();
      const div = document.createElement('div');
      div.style.textAlign = 'center';
      div.style.padding = '40px';
      div.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
      div.textContent = text;
      container.appendChild(div);
    }

    async function triggerScan() {
      showStatus('Running diagnostics scan...');
      try {
        const res = await fetch('/api/scan');
        reportData = await res.json();
        renderDashboard();
      } catch (err) {
        showStatus('Failed to fetch scan results: ' + err.message, true);
      }
    }

    function renderDashboard() {
      if (!reportData) return;

      const health = reportData.health;
      const circle = document.getElementById('score-circle');
      circle.textContent = String(health.score);
      circle.style.borderColor = health.score >= 80 ? 'var(--success)' : (health.score >= 50 ? 'var(--warning)' : 'var(--danger)');

      const ratingEl = document.getElementById('score-rating');
      ratingEl.textContent = health.rating.toUpperCase();
      ratingEl.style.color = circle.style.borderColor;

      document.getElementById('stat-total').textContent = String(health.total);
      document.getElementById('stat-passed').textContent = String(health.passed);
      document.getElementById('stat-warning').textContent = String(health.warning);
      document.getElementById('stat-failed').textContent = String(health.failed);

      renderFindings();
    }

    function renderFindings() {
      const container = document.getElementById('findings-container');
      container.replaceChildren();
      if (!reportData || !reportData.results) return;

      let items = reportData.results;
      if (currentCategory !== 'all') {
        items = items.filter(r => r.category === currentCategory);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        items = items.filter(r => r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q));
      }

      if (items.length === 0) {
        showStatus('No diagnostic findings matching filter.');
        return;
      }

      for (const item of items) {
        const card = document.createElement('div');
        card.className = 'finding-card';

        const header = document.createElement('div');
        header.className = 'finding-header';

        const titleGroup = document.createElement('div');
        titleGroup.className = 'finding-title-group';

        const badge = document.createElement('span');
        badge.className = 'badge ' + (item.status === 'passed' ? 'badge-passed' : (item.status === 'warning' ? 'badge-warning' : 'badge-failed'));
        badge.textContent = item.status;

        const title = document.createElement('span');
        title.className = 'finding-title';
        title.textContent = item.title;

        titleGroup.appendChild(badge);
        titleGroup.appendChild(title);

        const categoryTag = document.createElement('span');
        categoryTag.className = 'category-tag';
        categoryTag.textContent = item.category;

        header.appendChild(titleGroup);
        header.appendChild(categoryTag);

        const summary = document.createElement('div');
        summary.className = 'finding-summary';
        summary.textContent = item.summary;

        card.appendChild(header);
        card.appendChild(summary);

        if (item.remediation && item.remediation.length > 0 && item.status !== 'passed') {
          const remDiv = document.createElement('div');
          remDiv.className = 'finding-remediation';

          const remTitle = document.createElement('div');
          remTitle.className = 'rem-title';
          remTitle.textContent = 'Recommended Action';

          const remList = document.createElement('ul');
          for (const rem of item.remediation) {
            const li = document.createElement('li');
            li.className = 'rem-item';
            li.textContent = rem;
            remList.appendChild(li);
          }

          remDiv.appendChild(remTitle);
          remDiv.appendChild(remList);
          card.appendChild(remDiv);
        }

        container.appendChild(card);
      }
    }

    function filterCategory(cat) {
      currentCategory = cat;
      const tabs = document.querySelectorAll('.tab');
      tabs.forEach(t => {
        if (t.textContent.toLowerCase() === cat.toLowerCase() || (cat === 'all' && t.textContent.toLowerCase() === 'all')) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });
      renderFindings();
    }

    function handleSearch() {
      searchQuery = document.getElementById('search-input').value;
      renderFindings();
    }

    async function exportReport(fmt) {
      if (!reportData) await triggerScan();
      const modal = document.getElementById('export-modal');
      const title = document.getElementById('export-modal-title');
      const pre = document.getElementById('export-modal-pre');

      title.textContent = 'Export Diagnostic Report (' + fmt.toUpperCase() + ')';
      if (fmt === 'json') {
        pre.textContent = JSON.stringify(reportData, null, 2);
      } else {
        const res = await fetch('/api/export/markdown');
        pre.textContent = await res.text();
      }
      modal.style.display = 'flex';
    }

    function closeModal() {
      document.getElementById('export-modal').style.display = 'none';
    }

    function copyExportText() {
      const text = document.getElementById('export-modal-pre').textContent || '';
      navigator.clipboard.writeText(text);
      alert('Copied report to clipboard!');
    }

    window.addEventListener('DOMContentLoaded', triggerScan);
  </script>
</body>
</html>`;
}
