const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onWindowRefocused: (callback) => ipcRenderer.on('window-refocused', (_event, value) => callback(value))
});
