import { app, BrowserWindow, components, Menu, ipcMain, IpcMainEvent } from 'electron';
import path from 'path'
import fs from 'fs'
import { MPRISService } from './mpris/service'
import { PlaybackStatus } from './mpris/enums';
import { Client } from '@xhayper/discord-rpc';
import { microToSec, secToMicro } from './utils';

let mainWindow: Electron.BrowserWindow;

app.commandLine.appendSwitch(
    'enable-features',
    'UseOzonePlatform,WaylandWindowDecorations',
);
app.commandLine.appendSwitch('disable-features', 'MediaSessionService');

async function setupRichPresence() {
    const client = new Client({ clientId: '1350945271827136522' });
    client.on('ready', () => {
        console.log('Discord RPC connected')
        ipcMain.on('nowPlaying', (event: IpcMainEvent, data: any) => {
            client.user?.setActivity({
                type: 2,
                details: data['name'],
                state: `by ${data['artistName']}`,
                largeImageKey: data.artwork.url.replace('{w}', data.artwork.width).replace('{h}', data.artwork.height),
                largeImageText: data['albumName'],
                smallImageKey: 'play',
                smallImageText: 'fweqfwefqw',
                startTimestamp: Date.now(),
                endTimestamp: Date.now() + data.durationInMillis,
                instance: false
            })
        })
    })
    client.login()
}

async function setupMpris() {
    function sendIpc(channel: string, data: any = null) {
        mainWindow.webContents.send(channel, data)
    }
    try {
        const asyncWrapper = (fn: any) => (...args: any[]) => {
            fn(...args).catch((error: any) => {
                console.error('Unhandled error:', error)
            })
        }

        const mpris = new MPRISService()

        mpris.on('initalized', () => {
            console.log('MPRIS initalized')
        })

        mpris.on('playpause', asyncWrapper(async () => sendIpc('playpause')))
        mpris.on('play', asyncWrapper(async () => sendIpc('playbackState', { state: 'playing' })))
        mpris.on('pause', asyncWrapper(async () => sendIpc('playbackState', { state: 'paused' })))
        mpris.on('stop', asyncWrapper(async () => sendIpc('playbackState', { state: 'stopped' })))
        mpris.on('seek', asyncWrapper(async (progress: number) => sendIpc('playbackTime', { progress: microToSec(progress) })))
        mpris.on('next', asyncWrapper(async () => sendIpc('nextTrack')))
        mpris.on('previous', asyncWrapper(async () => sendIpc('previousTrack')))

        ipcMain.on('nowPlaying', asyncWrapper(async (event: IpcMainEvent, data: any) => {
            console.log('Now Playing:', data)

            if (Object.keys(data).length === 0) {
                mpris.setMetadata({})
                mpris.setPlaybackStatus(PlaybackStatus.Stopped)
                return
            }
            mpris.setMetadata({
                'mpris:trackid': '/org/mpris/MediaPlayer2/Track/1',
                'mpris:length': data.durationInMillis * 1000,
                'mpris:artUrl': data.artwork.url.replace('{w}', data.artwork.width).replace('{h}', data.artwork.height),
                'xesam:title': data.name,
                'xesam:album': data.albumName,
                'xesam:artist': [data.artistName],
                'xesam:trackNumber': data.trackNumber,
                'xesam:discNumber': data.discNumber,
            })
            mpris.setPlaybackStatus(PlaybackStatus.Playing)
        }))

        ipcMain.on('playbackState', asyncWrapper(async (event: IpcMainEvent, data: any) => {
            console.log('Playback State:', data)
            switch (data['state']) {
                case 'playing':
                    mpris.setPlaybackStatus(PlaybackStatus.Playing)
                    break;
                case 'paused':
                    mpris.setPlaybackStatus(PlaybackStatus.Paused)
                    break;
                case 'stopped':
                    mpris.setPlaybackStatus(PlaybackStatus.Stopped)
                    break;
            }
        }))

        ipcMain.on('playbackTime', asyncWrapper(async (event: IpcMainEvent, data: any) => {
            mpris.setPosition(secToMicro(data['position']))
        }))
    } catch (e) {
        console.error('MPRIS Error:', e)
    }
}


app.whenReady().then(async () => {
    await components.whenReady()
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(path.resolve(), 'dist', 'preload.js'),
            nodeIntegration: false,
            plugins: true
        }
    });
    const menu = Menu.buildFromTemplate([
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        console.log('About clicked')
                    }
                }
            ]
        }
    ])
    Menu.setApplicationMenu(menu)
    process.on('SIGINT', () => process.exit(0))
    
    
    await setupMpris()
    await setupRichPresence()

    mainWindow.loadURL('https://beta.music.apple.com/br');
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('dom-ready', () => {
        const pathJoin = (script: string) => path.join(path.resolve(), 'src', 'userscripts', script)
        mainWindow.webContents.executeJavaScript(fs.readFileSync(pathJoin('musicKitHook.js')).toString())
        mainWindow.webContents.executeJavaScript(fs.readFileSync(pathJoin('styleFix.js')).toString())
    })
    //mainWindow.loadURL('https://bitmovin.com/demos/drm/')
});
