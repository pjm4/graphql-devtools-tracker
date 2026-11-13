// Register the GraphQL panel inside Chrome DevTools
if (typeof chrome !== 'undefined' && chrome.devtools?.panels) {
  chrome.devtools.panels.create('GraphQL', '', 'panel.html');
}
