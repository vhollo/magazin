import { marked } from 'marked';

// Configure marked for safe rendering
// This configuration applies globally once this module is imported
marked.setOptions({
  breaks: true,
  gfm: true,
  renderer: (() => {
    const renderer = new marked.Renderer();
    const originalLink = renderer.link;
    renderer.link = function(link) {
      if (link.href && link.href.startsWith('http')) {
        // open external links in new tab
        const out = originalLink.call(this, link);
        // inject target and rel if not already present
        return out.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ');
      }
      return originalLink.call(this, link);
    };
    return renderer;
  })()
});

// Re-export marked so components can import it from here
export { marked };

