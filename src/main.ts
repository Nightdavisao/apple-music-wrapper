import { app, dialog, BrowserWindow, components, Menu, ipcMain, IpcMainEvent, MenuItem, Tray, MenuItemConstructorOptions } from 'electron';
import path from 'path'
import fs from 'fs'
import { Player } from './player';
import { MPRISIntegration } from './integration/mpris';
import { TrackMetadata } from './@types/interfaces';
import { MKRepeatMode } from './@types/enums';
import { DiscordIntegration } from './integration/discord';
import { AppConfig } from './config';

let mainWindow: Electron.BrowserWindow;

app.commandLine.appendSwitch(
    'enable-features',
    'UseOzonePlatform,WaylandWindowDecorations',
);
app.commandLine.appendSwitch('disable-features', 'MediaSessionService');

app.whenReady().then(async () => {
    let isQuitting = false

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

    const configHelper = new AppConfig(app, {
        enableDiscordRPC: true,
        enableMPRIS: true
    })

    const player = new Player(ipcMain, mainWindow.webContents)
    if (configHelper.get('enableMPRIS'))
        player.addIntegration(new MPRISIntegration(player))
    
    if (configHelper.get('enableDiscordRPC'))
        player.addIntegration(new DiscordIntegration(player))

    player.initalize()

    const playbackTemplate = () => [
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
                    label: 'Minimize to tray',
                    click: () => {
                        mainWindow.hide()
                    }
                },
                {
                    label: 'Quit',
                    click: () => {
                        isQuitting = true
                        app.quit()
                    }
                }
            ]
        },
        {
            id: 'playback',
            label: 'Playback',
            submenu: playbackTemplate()
        },
        {
            id: 'options',
            label: 'Options',
            submenu: [
                {
                    label: 'Enable Discord RPC',
                    type: 'checkbox',
                    checked: configHelper.get('enableDiscordRPC'),
                    click: (menuItem: MenuItem) => {
                        configHelper.set('enableDiscordRPC', menuItem.checked)
                    }
                },
                {
                    label: 'Enable MPRIS Integration',
                    type: 'checkbox',
                    checked: configHelper.get('enableMPRIS'),
                    click: (menuItem: MenuItem) => {
                        configHelper.set('enableMPRIS', menuItem.checked)
                    }
                }
            ]
        },
        {
            id: 'help',
            label: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: async () => {
                        dialog.showMessageBox({
                            title: 'About',
                            message: 'am-wrapper',
                            detail: `A simple wrapper for Apple Music's website with some extra features like MPRIS and Discord RPC.\n\n
                            Disclaimer: This application is not an official Apple product. It is not endorsed, sponsored, or affiliated with Apple Inc. All trademarks, logos, and intellectual property are the property of their respective owners. Use of this app is at your own risk.\n\n
                            Version: ${app.getVersion()}`.split('\n').map(line => line.trim()).join('\n'),
                            
                            buttons: ['Close']
                        })
                    }
                }
            ]
        }
    ] as Electron.MenuItemConstructorOptions[]

    const buildMainWindowMenu = () => {
        const menu = Menu.buildFromTemplate(createMenuTemplate())
        Menu.setApplicationMenu(menu)
    }

    const tray = new Tray(path.join(path.resolve(), 'assets', 'am-icon.png'))
    tray.setToolTip('Apple Music')
    //tray.on('click', () => mainWindow.show()) this crashes the app for me for some reason
    
    const buildTrayMenu = () => {
        const menu = Menu.buildFromTemplate([
            ...playbackTemplate() as MenuItemConstructorOptions[],
            { type: 'separator' },
            {
                label: 'Show',
                click: () => {
                    mainWindow.show()
                }
            },
            {
                label: 'Quit',
                click: () => {
                    isQuitting = true
                    app.quit()
                }
            }
        ])
        tray.setContextMenu(menu)
    }

    const buildMenus = () => {
        buildMainWindowMenu()
        buildTrayMenu()
    }

    buildMenus()

    player.on('nowPlaying', (data: TrackMetadata) => buildMenus())
    player.on('shuffle', () => buildMenus())
    player.on('repeat', () => buildMenus())

    // this a workaround for the app not closing properly
    process.on('SIGINT', () => process.exit(0))

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault()
            mainWindow.hide()
            return false
        } else {
            mainWindow.destroy()
            return true
        }
    })

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.alt && input.key === 'ArrowLeft') {
            mainWindow.webContents.navigationHistory.goBack()
        }
        if (input.alt && input.key === 'ArrowRight') {
            mainWindow.webContents.navigationHistory.goForward()
        }

        if (input.alt && input.control && input.key.toLowerCase() === 'i') {
            mainWindow.webContents.openDevTools();
        }
    })

    mainWindow.webContents.on('dom-ready', () => {
        const pathJoin = (script: string) => path.join(path.resolve(), 'src', 'userscripts', script)
        mainWindow.webContents.executeJavaScript(fs.readFileSync(pathJoin('musicKitHook.js')).toString())
        mainWindow.webContents.executeJavaScript(fs.readFileSync(pathJoin('styleFix.js')).toString())
    })

    mainWindow.loadURL('https://beta.music.apple.com/br');
});
