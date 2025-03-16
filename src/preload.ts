import { contextBridge, ipcRenderer } from 'electron'

interface AMWrapper {
    ipcRenderer: {
        send: (channel: string, data: any) => void,
        on: (channel: string, func: (...args: any[]) => void) => void
    }
}

contextBridge.exposeInMainWorld('AMWrapper', {
    ipcRenderer: {
        send: (channel: string, data: any) => {
            ipcRenderer.send(channel, JSON.stringify(data))
        },
        on: (channel: string, func: (...args: any[]) => void) => {
            ipcRenderer.on(channel, func)
        }
    }
} as AMWrapper)