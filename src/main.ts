import { app, shell, dialog, BrowserWindow, nativeTheme, components, Menu, ipcMain, MenuItem, Tray, MenuItemConstructorOptions } from 'electron';
import path from 'path'
import fs from 'fs'
import { Player } from './player';
import { MPRISIntegration } from './integration/mpris';
import { MKPlaybackState, MKRepeatMode } from './@types/enums';
import { DiscordIntegration } from './integration/discord';
import { AppConfig } from './config';
import { LastFMClient } from './lastfm/client';
import { AM_BASE_URL, LASTFM_CREDS, parseCookie } from './utils';
import { LastFMIntegration } from './integration/lastfm';
import { TrackMetadata } from './@types/interfaces';
import log4js from 'log4js'
import os from 'node:os'

const logger = log4js.getLogger('amwrapper-main')
logger.level = 'debug'

let mainWindow: Electron.BrowserWindow;
const currentPlatform = os.platform()
logger.debug('current operating system:', currentPlatform)

if (currentPlatform === 'linux') {
    app.commandLine.appendSwitch(
        'enable-features',
        'UseOzonePlatform,WaylandWindowDecorations',
    );
    app.commandLine.appendSwitch('disable-features', 'MediaSessionService');
}

app.whenReady().then(async () => {
    const DEFAULT_TITLE = 'Apple Music'

    const lastFmClient = new LastFMClient(
        LASTFM_CREDS.apiKey,
        LASTFM_CREDS.apiSecret
    )

    function validateLfmAuthToken() {
        const authToken = configHelper.get('lastFmAuthToken')
        logger.info('validating last.fm auth token', authToken)

        lastFmClient.validateAuthToken(authToken)
            .then(data => {
                configHelper.set('lastFmSession', {
                    username: data['session']['name'],
                    subscriber: data['session']['subscriber'],
                    token: data['session']['key']
                })
                configHelper.delete('lastFmAuthToken')
                loadLastFmIntegration()

                return
            })
            .catch(error => {
                logger.debug('failed to retrieve an actual last.fm token', error)
                configHelper.delete('lastFmAuthToken')
            })
    }

    let isQuitting = false

    await components.whenReady()
    const resourcesPath = process.env.NODE_ENV === 'dev' ?
        __dirname.split(path.sep).slice(0, -1).join(path.sep)
        : process.resourcesPath 

    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            plugins: true
        },
        darkTheme: true,
        show: false
    });
    nativeTheme.themeSource = 'dark'
    mainWindow.setTitle(DEFAULT_TITLE)

    const configHelper = new AppConfig(app, {
        enableDiscordRPC: true,
        enableMPRIS: true,
        enableLastFm: true
    })

    const player = new Player(ipcMain, mainWindow.webContents)
    if (configHelper.get('enableMPRIS') && currentPlatform === 'linux') {
        player.addIntegration(new MPRISIntegration(player))
    }

    if (configHelper.get('enableDiscordRPC')) {
        player.addIntegration(new DiscordIntegration(player))
    }

    function loadLastFmIntegration() {
        if (!configHelper.get('enableLastFm')) return

        const lastFmSession = configHelper.get('lastFmSession')['token']

        if (lastFmSession) {
            const lastFmIntegration = new LastFMIntegration(player, lastFmClient, lastFmSession)
            player.addIntegration(lastFmIntegration)
            return lastFmIntegration
        } else {
            logger.debug('last.fm: tried to load lastfm integration, but the saved session is invalid')
        }
    }

    const lastFmIntegration = loadLastFmIntegration()

    player.initialize()

    const playbackTemplate = () => [
        {
            id: 'nowPlaying',
            label: player.metadata?.name ? `${player.metadata.name} - ${player.metadata.artistName}` : 'No music playing',
            enabled: false
        },
        { type: 'separator' },
        {
            label: '&Play/Pause',
            click: () => {
                player.playPause()
            }
        },
        {
            label: '&Next',
            click: () => {
                player.next()
            }
        },
        {
            label: 'P&revious',
            click: () => {
                player.previous()
            }
        },
        { type: 'separator' },
        {
            label: '&Shuffle',
            type: 'checkbox',
            checked: player.shuffleMode,
            click: (menuItem: MenuItem) => {
                player.setShuffle(menuItem.checked)
            }
        },
        {
            label: '&Repeat',
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
                    label: '&Track',
                    type: 'radio',
                    checked: player.repeatMode === MKRepeatMode.One,
                    click: () => {
                        player.setRepeat(MKRepeatMode.One)
                    }
                },
                {
                    label: 'A&lbum/Playlist',
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
            id: 'File',
            label: '&File',
            submenu: [
                {
                    label: '&Back',
                    click: () => {
                        mainWindow.webContents.navigationHistory.goBack()
                    }
                },
                {
                    label: '&Forward',
                    click: () => {
                        mainWindow.webContents.navigationHistory.goForward()
                    }
                },
                ...(process.env.NODE_ENV === 'dev' ? [
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
                    }
                ] : []),
                { type: 'separator' },
                {
                    label: 'Minimize to tray',
                    click: () => {
                        mainWindow.hide()
                        buildTrayMenu()
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
            label: '&Playback',
            submenu: playbackTemplate()
        },
        {
            id: 'options',
            label: '&Options',
            submenu: [
                {
                    label: '&Discord integration',
                    type: 'checkbox',
                    checked: configHelper.get('enableDiscordRPC'),
                    click: (menuItem: MenuItem) => {
                        configHelper.set('enableDiscordRPC', menuItem.checked)
                    }
                },
                {
                    label: '&MPRIS integration',
                    type: 'checkbox',
                    checked: configHelper.get('enableMPRIS'),
                    click: (menuItem: MenuItem) => {
                        configHelper.set('enableMPRIS', menuItem.checked)
                    }
                },
                {
                    label: "&Last.fm",
                    submenu: [
                        {
                            label: 'Enabled',
                            type: 'checkbox',
                            checked: configHelper.get('enableLastFm'),
                            click: (menuItem: MenuItem) => {
                                configHelper.set('enableLastFm', menuItem.checked)
                            }
                        },
                        {
                            type: 'separator'
                        },
                        ...(configHelper.get('lastFmSession') ? [
                            {
                                label: configHelper.get('lastFmSession')['username'],
                                enabled: false
                            },
                            {
                                label: configHelper.get('lastFmSession')['subscriber'] === 1 ? 'Last.fm Pro' : 'Normal user',
                                checked: configHelper.get('lastFmSession')['subscriber'] === 1,
                                type: 'checkbox',
                                enabled: false
                            },
                            {
                                type: 'separator'
                            },
                            {
                                label: lastFmIntegration?.wasScrobbled ?
                                    'Scrobbled'
                                    : lastFmIntegration?.wasIgnored ? 'Scrobble ignored' :
                                    player.playbackState === MKPlaybackState.Playing ? 'Scrobbling' : 'Not playing',
                                type: 'checkbox',
                                checked: lastFmIntegration?.wasScrobbled,
                                enabled: false
                            },
                            {
                                type: 'separator'
                            },
                            {
                                label: 'Log &out...',
                                click: () => {
                                    configHelper.delete('lastFmAuthToken')
                                    configHelper.delete('lastFmSession')
                                }
                            }
                        ] : [
                            {
                                label: configHelper.get('lastFmAuthToken') ? 'Authenticate...' : 'Log in...',
                                click: async () => {
                                    if (!configHelper.get('lastFmAuthToken')) {
                                        const response = await lastFmClient.requestAuthToken()
                                        const authToken = response['token']
                                        configHelper.set('lastFmAuthToken', authToken)
                                        if (authToken) {
                                            logger.info('last.fm: successfully retrieved the session token, redirecting user to the authorization page')
                                            shell.openExternal(`http://www.last.fm/api/auth/?api_key=${LASTFM_CREDS.apiKey}&token=${authToken}`)
                                        }
                                    } else {
                                        validateLfmAuthToken()
                                    }
                                }
                            }
                        ])
                    ]
                }
            ]
        },
        {
            id: 'help',
            label: '&Help',
            submenu: [
                {
                    label: '&About',
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

    const buildMainWindowMenu = async () => {
        const menu = Menu.buildFromTemplate(createMenuTemplate())
        Menu.setApplicationMenu(menu)
    }


    const tray = new Tray(path.join(resourcesPath, 'assets', 'am-icon.png'))
    tray.setToolTip('Apple Music')
    //tray.on('click', () => mainWindow.show()) this crashes the app for me for some reason

    const buildTrayMenu = () => {
        const menu = Menu.buildFromTemplate([
            ...playbackTemplate() as MenuItemConstructorOptions[],
            { type: 'separator' },
            mainWindow.isVisible() ? {
                label: 'Hide',
                click: () => {
                    mainWindow.hide()
                    buildTrayMenu()
                }
            } : {
                label: 'Show',
                click: () => {
                    mainWindow.show()
                    buildTrayMenu()
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

    player.on('nowPlaying', (metadata: TrackMetadata) => {
        if (metadata) {
            mainWindow.setTitle(`${metadata.name} - ${metadata.artistName} — ${DEFAULT_TITLE}`)
        }
        buildMenus()
    })
    player.on('playbackState', ({ state }) => {
        if (player.metadata) {
            switch (state) {
                case MKPlaybackState.Paused:
                    mainWindow.setTitle(`⏸ ${player.metadata?.name} - ${player.metadata?.artistName} — ${DEFAULT_TITLE}`)
                    break
                case MKPlaybackState.Playing:
                    mainWindow.setTitle(`▶ ${player.metadata?.name} - ${player.metadata?.artistName} — ${DEFAULT_TITLE}`)
                    break
                default:
                    mainWindow.setTitle(DEFAULT_TITLE)
                    break
            }
        } else {
            mainWindow.setTitle(DEFAULT_TITLE)
        }
        buildMenus()
    })

    player.on('lfm:scrobble', () => buildMenus())
    player.on('shuffle', () => buildMenus())
    player.on('repeat', () => buildMenus())

    configHelper.on('setKey', () => buildMenus())
    configHelper.on('deletedKey', () => buildMenus())

    // this a workaround for the app not closing properly
    process.on('SIGINT', () => process.exit(0))

    mainWindow.on('page-title-updated', e => e.preventDefault())

    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault()
            mainWindow.hide()
            buildTrayMenu()
            return false
        } else {
            mainWindow.destroy()
            return true
        }
    })

    ipcMain.on('open-menu', () => {
        const menu = Menu.buildFromTemplate(createMenuTemplate())
        menu.popup({ window: mainWindow })
    })

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.alt && input.key === 'ArrowLeft') {
            mainWindow.webContents.navigationHistory.goBack()
            return
        }
        if (input.alt && input.key === 'ArrowRight') {
            mainWindow.webContents.navigationHistory.goForward()
            return
        }

        if (input.alt && input.shift && input.key.toLowerCase() === 'i') {
            mainWindow.webContents.openDevTools();
            return
        }
    })

    function loadScripts(filenames: Array<string>, stage: string) {
        filenames.forEach(async scriptFileName  => {
            logger.info(`${stage}: loading ${scriptFileName}`)
            try {
                await mainWindow.webContents.executeJavaScript(
                    fs.readFileSync(
                        path.join(resourcesPath, 'assets', 'userscripts', scriptFileName)
                    ).toString()
                )
            } catch(e) {
                logger.debug(`failed to load script ${scriptFileName}`, e)
            }
        })
    }

    mainWindow.webContents.on('did-navigate', () => loadScripts(['musicKitHook.js'], 'pre-navigation'))
    mainWindow.webContents.on('did-finish-load', () => loadScripts(['styleFix.js', 'navButtons.js'], 'post-load'))
    
    mainWindow.on('ready-to-show', () => mainWindow.show())

    mainWindow.webContents.setWindowOpenHandler(() => {
        return { action: 'deny' }
    })

    try {
        if (!configHelper.get('storefrontId')) {
            const amResponse = await fetch(AM_BASE_URL)
            const setCookieResponse = amResponse.headers.get('Set-Cookie')
            if (setCookieResponse) {
                const cookie = parseCookie(setCookieResponse)
                const guessedGeo = cookie['geo']
    
                if (guessedGeo) {
                    logger.info(`guessed user location is ${guessedGeo}`)
                    configHelper.set('storefrontId', guessedGeo)
                }
            }
        }
    } catch(e) {
        logger.debug('failed to guess user location for setting the correct storefront.', e)
    }

    const guessedGeo = configHelper.get('storefrontId')

    if (guessedGeo && typeof guessedGeo === 'string') {
        mainWindow.loadURL(`${AM_BASE_URL}/${guessedGeo.toLowerCase()}`)
    } else {
        mainWindow.loadURL(AM_BASE_URL)
    }

    return
}).catch(logger.error);
