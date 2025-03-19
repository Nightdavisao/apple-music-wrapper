import { IpcMain, IpcMainEvent } from 'electron';
import { EventEmitter } from 'events';
import { PlayerIntegration, TrackMetadata } from './@types/interfaces';
import { MKPlaybackState, MKRepeatMode } from './@types/enums';


export class Player extends EventEmitter {
    ipcMain: IpcMain
    webContents: Electron.WebContents
    metadata: TrackMetadata | null
    playbackState: MKPlaybackState
    playbackTime: number
    shuffleMode: boolean
    repeatMode: MKRepeatMode
    playerEvents: string[]
    integrations: PlayerIntegration[]
    constructor(ipcMain: IpcMain, webContents: Electron.WebContents) {
        super()
        this.ipcMain = ipcMain
        this.webContents = webContents
        this.playerEvents = ['nowPlaying', 'playbackState', 'playbackTime', 'shuffle', 'repeat']
        
        this.metadata = null
        this.playbackState = MKPlaybackState.Stopped
        this.playbackTime = 0
        this.repeatMode = MKRepeatMode.None
        this.shuffleMode = false
        
        this.integrations = []
    }

    dispatchIpcMessage(channel: string, data: any = null) {
        this.webContents.send(channel, data)
    }

    playPause() {
        this.dispatchIpcMessage('playpause')
    }

    play() {
        this.dispatchIpcMessage('playbackState', { state: 'playing' })
    }

    pause() {
        this.dispatchIpcMessage('playbackState', { state: 'paused' })
    }

    stop() {
        this.dispatchIpcMessage('playbackState', { state: 'stopped' })
    }

    next() {
        this.dispatchIpcMessage('nextTrack')
    }

    previous() {
        this.dispatchIpcMessage('previousTrack')
    }

    setShuffle(mode: boolean) {
        if (typeof mode !== 'boolean' || this.shuffleMode === mode) return

        console.log('player: setShuffle', mode)
        this.dispatchIpcMessage('shuffle', { mode })
    }

    setRepeat(mode: MKRepeatMode) {
        if (typeof mode !== 'string' || this.repeatMode === mode) return

        console.log('player: setRepeat', mode)
        this.dispatchIpcMessage('repeat', { mode })
    }

    seek(time: number) {
        this.dispatchIpcMessage('playbackTime', { progress: time })
    }

    initalize() {
        this.playerEvents.forEach(event => {
            this.ipcMain.on(event, (_: IpcMainEvent, data: any) => {
                this.emit(event, data)
            })
        })

        this.on('nowPlaying', (data: TrackMetadata) => {
            this.metadata = data
            this.playbackTime = 0
        })
        this.on('playbackState', (data: { state: MKPlaybackState }) => this.playbackState = data.state)
        this.on('playbackTime', (data: { position: number }) => this.playbackTime = data.position)
        this.on('shuffle', (data: { mode: boolean }) => this.shuffleMode = data.mode)
        this.on('repeat', (data: { mode: MKRepeatMode }) => this.repeatMode = data.mode)

        this.integrations.forEach(i => i.load())
    }

    addIntegration(integration: PlayerIntegration) {
        this.integrations.push(integration)
    }
    removeIntegration(integration: PlayerIntegration) {
        this.integrations = this.integrations.filter(i => i !== integration)
    }
}