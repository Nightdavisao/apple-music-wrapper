/* eslint-disable @typescript-eslint/no-explicit-any */
import { contextBridge, ipcRenderer } from 'electron'

interface AMWrapper {
    ipcRenderer: {
        send: (channel: string, data: any) => void,
        on: (channel: string, func: (...args: any[]) => void) => void
    },
    openBurgerMenu: () => void,
    window: {
        minimize: () => void,
        maximize: () => void,
        close: () => void
    }
}

contextBridge.exposeInMainWorld('AMWrapper', {
    ipcRenderer: {
        send: (channel: string, data: any) => {
            ipcRenderer.send(channel, data)
        },
        on: (channel: string, func: (...args: any[]) => void) => {
            ipcRenderer.on(channel, func)
        }
    },
    openBurgerMenu: () => {
        ipcRenderer.send('open-menu')
    },
    window: {
        minimize: () => ipcRenderer.send('window', 'minimize'),
        maximize: () => ipcRenderer.send('window', 'maximize'),
        close: () => ipcRenderer.send('window', 'close')
    }
} as AMWrapper)