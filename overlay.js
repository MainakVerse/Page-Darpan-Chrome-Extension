// overlay.js
(function () {
  if (window.__summarizer) return; // prevent double injection

  // === Overlay Container ===
  const container = document.createElement('div');
  container.id = 'summarizer-overlay';
  container.innerHTML = `
    <div class="summarizer-header">
      <strong>Page Darpan - Made by Mainak 😎</strong>
      <div class="summarizer-controls">
        <button id="summarizer-refresh" title="Refresh">⟳</button>
        <button id="summarizer-toggle" title="Minimize">−</button>
        <button id="summarizer-close" title="Close">✕</button>
      </div>
    </div>
    <div class="summarizer-body">
      <canvas id="summarizer-chart"></canvas>
      <div id="summarizer-domains" class="domains-list"></div>
    </div>
    <div class="summarizer-footer">Processed locally • Page 1 only</div>
  `;
  document.body.appendChild(container);

  // === Styling for better UI ===
  const style = document.createElement("style");
  style.textContent = `
    #summarizer-overlay {
      position: fixed;
      top: 50px;
      right: 50px;
      width: 360px;
      background: #fff;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      font-family: Arial, sans-serif;
      font-size: 13px;
      z-index: 99999;
    }
    .summarizer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: #f3f3f3;
      border-bottom: 1px solid #ccc;
      font-weight: bold;
      cursor: grab;
    }
    .summarizer-controls button {
      margin-left: 5px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
    }
    .summarizer-body {
      padding: 8px;
      max-height: 320px;
      overflow-y: auto;
    }
    #summarizer-chart {
      width: 100%;
      height: 200px;
    }
    #summarizer-domains {
      margin-top: 10px;
      font-size: 12px;
    }
    #summarizer-domains ul {
      padding-left: 16px;
      margin: 4px 0;
    }
    .summarizer-footer {
      padding: 4px 10px;
      font-size: 11px;
      color: #666;
      background: #fafafa;
      border-top: 1px solid #eee;
    }
  `;
  document.head.appendChild(style);

  // === Drag Support ===
  (function enableDrag(el) {
    let isDown = false, startX=0, startY=0, origX=0, origY=0;
    const hdr = el.querySelector('.summarizer-header');
    hdr.addEventListener('mousedown', (e) => {
      isDown = true; startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
      hdr.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = Math.max(8, origX + dx) + 'px';
      el.style.top = Math.max(8, origY + dy) + 'px';
      el.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (isDown) { isDown = false; hdr.style.cursor = 'grab'; }
    });
  })(container);

  // === Chart.js Setup ===
  let chart = null;
  const ctx = container.querySelector('#summarizer-chart').getContext('2d');

  function drawChart(domains) {
    const labels = domains.map(d => d.domain);
    const data = domains.map(d => d.count);

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.update();
      return;
    }

    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Domain Frequency',
          data,
          backgroundColor: '#4A90E2',
          borderRadius: 6,
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        },
        scales: {
          x: { ticks: { maxRotation: 45, minRotation: 20 } },
          y: { beginAtZero: true, precision: 0 }
        }
      }
    });
  }

  function showDomains(domains) {
    const dcont = container.querySelector('#summarizer-domains');
    if (!domains || domains.length === 0) {
      dcont.innerHTML = '<small>No domain breakdown</small>';
      return;
    }
    dcont.innerHTML = '<strong>Top domains:</strong><ul>' +
      domains.map(d => `<li>${d.domain} (${d.count})</li>`).join('') +
      '</ul>';
  }

  // === Controls ===
  container.querySelector('#summarizer-close').addEventListener('click', () => {
    container.style.display = 'none';
  });
  container.querySelector('#summarizer-toggle').addEventListener('click', (e) => {
    const body = container.querySelector('.summarizer-body');
    if (body.style.display === 'none') {
      body.style.display = ''; e.target.textContent = '−';
    } else {
      body.style.display = 'none'; e.target.textContent = '+';
    }
  });
  container.querySelector('#summarizer-refresh').addEventListener('click', () => {
    window.postMessage({ type: 'summarizer-refresh' }, '*');
  });

  // === Public Interface ===
  window.__summarizer = {
    show(payload) {
      try {
        const domains = payload.domains || [];
        drawChart(domains);   // now plotting domains instead of words
        showDomains(domains);
        container.style.display = '';
      } catch (e) {
        console.error('Summarizer show error', e);
      }
    },
    hide() {
      container.style.display = 'none';
    }
  };

  container.style.display = 'none'; // start hidden
})();
