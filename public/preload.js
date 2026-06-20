const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // Main window → overlay: push current task state
  sendTasksUpdated: (data) => ipcRenderer.send('tasks-updated', data),

  // Overlay listens for task state from main window
  onTasksUpdated: (callback) => {
    ipcRenderer.on('tasks-updated', (_event, data) => callback(data));
  },

  // Overlay → main: a task was marked complete
  sendTaskComplete: (data) => ipcRenderer.send('task-complete', data),

  // Main window listens for completion events from overlay
  onTaskComplete: (callback) => {
    ipcRenderer.on('task-complete', (_event, data) => callback(data));
  },

  // Launch URL or native app (main process uses shell.openExternal / spawn)
  launchCommand: (item) => ipcRenderer.invoke('launch-command', item),
});
