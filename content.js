// content.js
(function () {
  // Helper: robust selector for Google search results
  function getResultNodes() {
    // Try several common containers used by Google
    return Array.from(document.querySelectorAll('div.tF2Cxc, div.g, div.rc')).filter(n => n.innerText && n.innerText.trim().length > 0);
  }

  // Extract title & snippet from result node
  function extractFromNode(node) {
    const titleEl = node.querySelector('h3');
    const snippetEl = node.querySelector('.VwiC3b') || node.querySelector('.IsZvec');
    const linkEl = node.querySelector('a');
    return {
      title: titleEl ? titleEl.innerText.trim() : '',
      snippet: snippetEl ? snippetEl.innerText.trim() : '',
      link: linkEl ? linkEl.href : ''
    };
  }

  // Basic stopwords set (small)
  const STOPWORDS = new Set([
    'the','this','that','which','from','with','have','will','your','about','their','there','these','those',
    'what','when','where','who','why','how','like','also','more','other','some','such','many','been','they','them',
    'using','use','may','can','also','than','each'
  ]);

  // Compute frequency of words, excluding short & stopwords
  function computeTopWords(text, topN = 8) {
    const words = (text || '').toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
    const freq = Object.create(null);
    for (const w of words) {
      if (w.length < 4) continue;               // ignore very short
      if (!/^[a-z0-9]+$/.test(w)) continue;
      if (STOPWORDS.has(w)) continue;
      freq[w] = (freq[w] || 0) + 1;
    }
    const entries = Object.entries(freq).sort((a,b) => b[1] - a[1]).slice(0, topN);
    return entries.map(([w,c]) => ({ word: w, count: c }));
  }

  function gatherDataAndRender() {
    const nodes = getResultNodes();
    if (!nodes.length) {
      // No results found — hide overlay
      window.__summarizer && window.__summarizer.hide();
      return;
    }
    const items = nodes.map(extractFromNode);
    const combinedText = items.map(i => (i.title + ' ' + i.snippet)).join(' ');
    const top = computeTopWords(combinedText, 10);
    // also pass domain breakdown (simple)
    const domainCounts = {};
    items.forEach(i => {
      try {
        const u = new URL(i.link);
        const d = u.hostname.replace(/^www\./, '');
        domainCounts[d] = (domainCounts[d] || 0) + 1;
      } catch (e) {}
    });
    const domains = Object.entries(domainCounts).sort((a,b) => b[1]-a[1]).slice(0,6).map(([d,c])=>({domain:d, count:c}));
    // Provide data to overlay (overlay defines window.__summarizer.show)
    if (window.__summarizer && typeof window.__summarizer.show === 'function') {
      window.__summarizer.show({ words: top, domains });
    } else {
      // If overlay not ready yet, schedule retry
      setTimeout(() => {
        if (window.__summarizer && typeof window.__summarizer.show === 'function') {
          window.__summarizer.show({ words: top, domains });
        }
      }, 500);
    }
  }

  // Run once when page loads. Also observe for dynamic changes (Google may change results dynamically).
  gatherDataAndRender();

  // Watch for changes in the results container and re-run (debounced)
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(gatherDataAndRender, 600);
  });

  // Observe the main results container(s)
  const resultsParent = document.getElementById('search') || document.querySelector('div#rso') || document.body;
  if (resultsParent) {
    observer.observe(resultsParent, { childList: true, subtree: true });
  }

  // Listen to manual refresh requests from overlay (e.g., user clicked refresh)
  window.addEventListener('message', event => {
    if (event && event.data && event.data.type === 'summarizer-refresh') {
      gatherDataAndRender();
    }
  }, false);
})();
