figma.showUI(__html__, { width: 480, height: 600 });

figma.ui.onmessage = (msg) => {
  if (msg.type === 'generate-iframe') {
    // Just echo back the iframe code to the UI
    figma.ui.postMessage({ type: 'iframe-code', code: msg.code });
  }
}; 