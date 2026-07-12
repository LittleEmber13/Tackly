"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("notasApi", {
  loadData: () => electron.ipcRenderer.invoke("notas:load"),
  saveData: (data) => electron.ipcRenderer.invoke("notas:save", data),
  selectDirectory: () => electron.ipcRenderer.invoke("tackly:selectDirectory"),
  getDataDir: () => electron.ipcRenderer.invoke("tackly:getDataDir")
});
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
