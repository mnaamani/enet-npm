chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    'width': 600,
    'height': 300,
    'type': 'panel'
  });
});
