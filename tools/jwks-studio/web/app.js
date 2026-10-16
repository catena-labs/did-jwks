/**
 * Catena Labs did:jwks Studio Client Logic
 */

let samples = [];

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadConfig();
  initFormListeners();
});

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tab.dataset.tab}`));
    });
  });
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    samples = data.samples;

    const select = document.getElementById('select-sample-did');
    select.innerHTML = '<option value="">-- Choose Sample did:jwks --</option>';

    samples.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.did;
      opt.textContent = `${s.name} (${s.keyType})`;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      if (select.value) {
        document.getElementById('input-did').value = select.value;
      }
    });

    if (samples.length > 0) {
      document.getElementById('input-did').value = samples[0].did;
    }
  } catch (e) {
    console.error(e);
  }
}

function initFormListeners() {
  // Resolve DID
  document.getElementById('resolve-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-resolve-did');
    const outBox = document.getElementById('did-doc-json-box');
    const resultBox = document.getElementById('resolve-result-box');

    const did = document.getElementById('input-did').value;

    btn.disabled = true;
    btn.textContent = '⏳ Resolving W3C DID Document...';

    try {
      const res = await fetch('/api/did/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did }),
      });
      const data = await res.json();

      if (data.didDocument) {
        outBox.textContent = JSON.stringify(data.didDocument, null, 2);
        resultBox.innerHTML = `
          <div class="card" style="border-color: #6366f1; background: rgba(99, 102, 241, 0.08);">
            <strong style="color: #a5b4fc;">🆔 W3C DID Document Resolved!</strong>
            <div class="mono text-muted mt-1" style="font-size: 0.75rem;">Canonical ID: ${data.didDocumentMetadata.canonicalId}</div>
          </div>
        `;
      }
    } catch (err) {
      resultBox.innerHTML = `<div class="badge red">Resolution error: ${err.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '🆔 Resolve to W3C DID Document';
    }
  });

  // Generate JWKS
  document.getElementById('generate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const domain = document.getElementById('gen-domain').value;
    const keyType = document.getElementById('gen-keytype').value;
    const outBox = document.getElementById('gen-output-box');

    try {
      const res = await fetch('/api/jwks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, keyType }),
      });
      const data = await res.json();

      outBox.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      outBox.textContent = `Error: ${err.message}`;
    }
  });
}
