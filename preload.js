'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('examAPI', {
  // Start screen → main process
  loadURL:      (url)  => ipcRenderer.send('load-url', url),
  minimize:     ()     => ipcRenderer.send('minimize-app'),

  // Exam bar → main process
  reloadExam:   ()          => ipcRenderer.send('reload-exam'),
  quitApp:      (password)  => ipcRenderer.send('quit-app', password),

  // Main process → exam bar
  onSetUrl:     (cb) => ipcRenderer.on('set-url',    (_, url)  => cb(url)),
  onQuitResult: (cb) => ipcRenderer.on('quit-result',(_, data) => cb(data)),
});