import { app, BrowserWindow, components, Menu, ipcMain, IpcMainEvent, MenuItem } from 'electron';
import path from 'path'
import fs from 'fs'
import { MPRISService } from './mpris/service'
import { PlaybackStatus } from './mpris/enums';
import { Client } from '@xhayper/discord-rpc';
import { microToSec, secToMicro } from './utils';
import { Player } from './player';
import { MPRISIntegration } from './integration/mpris';
import { TrackMetadata } from './@types/interfaces';
import { MKRepeatMode } from './@types/enums';

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

    const player = new Player(ipcMain, mainWindow.webContents)
    player.addIntegration(new MPRISIntegration(player))
    player.initalize()
    const createMenuTemplate = () => [
        {
            id: 'file',
            label: 'File',
            submenu: [
                {
                    label: 'Back',
                    click: () => {
                        mainWindow.webContents.navigationHistory.goBack()
                    }
                },
                {
                    label: 'Forward',
                    click: () => {
                        mainWindow.webContents.navigationHistory.goForward()
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reload',
                    click: () => {
                        mainWindow.reload()
                    }
                },
                {
                    label: 'Toggle DevTools',
                    click: () => {
                        mainWindow.webContents.toggleDevTools()
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    click: () => {
                        app.quit()
                    }
                }
            ]
        },
        {
            id: 'playback',
            label: 'Playback',
            submenu: [
                {
                    id: 'nowPlaying',
                    label: player.metadata?.name ? `${player.metadata.name} - ${player.metadata.artistName}` : 'No music playing',
                    enabled: false
                },
                { type: 'separator' },
                {
                    label: 'Play/Pause',
                    click: () => {
                        player.playPause()
                    }
                },
                {
                    label: 'Next',
                    click: () => {
                        player.next()
                    }
                },
                {
                    label: 'Previous',
                    click: () => {
                        player.previous()
                    }
                },
                { type: 'separator' },
                {
                    label: 'Shuffle',
                    type: 'checkbox',
                    checked: player.shuffleMode,
                    click: (menuItem: MenuItem) => {
                        player.setShuffle(menuItem.checked)
                    }
                },
                {
                    label: 'Repeat',
                    submenu: [
                        {
                            label: 'None',
                            type: 'radio',
                            checked: player.repeatMode === MKRepeatMode.None,
                            click: () => {
                                player.setRepeat(MKRepeatMode.None)
                            }
                        },
                        {
                            label: 'Track',
                            type: 'radio',
                            checked: player.repeatMode === MKRepeatMode.One,
                            click: () => {
                                player.setRepeat(MKRepeatMode.One)
                            }
                        },
                        {
                            label: 'Album/Playlist',
                            type: 'radio',
                            checked: player.repeatMode === MKRepeatMode.All,
                            click: () => {
                                player.setRepeat(MKRepeatMode.All)
                            }
                        }
                    ]
                }
            ]
        }
    ] as Electron.MenuItemConstructorOptions[]

    const buildMenu = () => {
        const menu = Menu.buildFromTemplate(createMenuTemplate())
        Menu.setApplicationMenu(menu)
    }

    buildMenu()

    player.on('nowPlaying', (data: TrackMetadata) => buildMenu())
    player.on('shuffle', () => buildMenu())
    player.on('repeat', () => buildMenu())

    process.on('SIGINT', () => process.exit(0))


    //await setupMpris()
    //await setupRichPresence()

    // setup hotkey for opening devtools
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key.toLowerCase() === 'f12') {
            mainWindow.webContents.openDevTools();
        }
    })

    mainWindow.webContents.on('dom-ready', () => {
        const pathJoin = (script: string) => path.join(path.resolve(), 'src', 'userscripts', script)
        mainWindow.webContents.executeJavaScript(fs.readFileSync(pathJoin('musicKitHook.js')).toString())
        mainWindow.webContents.executeJavaScript(fs.readFileSync(pathJoin('styleFix.js')).toString())
    })
    //mainWindow.loadURL('https://bitmovin.com/demos/drm/')
    mainWindow.loadURL('https://beta.music.apple.com/br');
});
