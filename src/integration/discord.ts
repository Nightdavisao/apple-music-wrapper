import { Client } from "@xhayper/discord-rpc"
import { Player } from "../player"
import { TrackMetadata, PlayerIntegration } from "../@types/interfaces"
import { MKPlaybackState } from "../@types/enums"
import { secToMicro, secToMillis } from "../utils"

export class DiscordIntegration implements PlayerIntegration {
    player: Player
    client: Client
    wasPaused: boolean
    reconnectTimeout: NodeJS.Timeout | null
    constructor(player: Player) {
        this.player = player
        this.client = new Client({ clientId: '1350945271827136522' })
        this.wasPaused = false
        this.reconnectTimeout = null
    }

    async load() {
        this.client.on('ready', () => {
            console.log('discord-rpc: discord RPC ready')

            //this.player.on('nowPlaying', (metadata: TrackMetadata) => this.setActivity(metadata))
            this.player.on('playbackState', ({ state }) => {
                switch (state) {
                    case MKPlaybackState.Playing:
                        if (this.player.metadata) this.setActivity(this.player.metadata)
                        break
                    case MKPlaybackState.Stopped:
                    case MKPlaybackState.Paused:
                    default:
                        this.wasPaused = true
                        this.client.user?.clearActivity()
                        break
                }
            })
            this.player.on('playbackTime', () => {
                if (this.player.metadata && this.wasPaused) {
                    this.setActivity(this.player.metadata)
                    this.wasPaused = false
                }
            })
        })
        this.client.on('disconnected', () => {
            console.log('discord-rpc: disconnected from Discord RPC')
            this.createReconnectInterval()
        })
        await this.connect()
    }

    async connect() {
        try {
            console.log('discord-rpc: connecting to Discord RPC')
            await this.client.login()
        } catch (error) {
            console.error('discord-rpc: error connecting to Discord RPC', error)
            this.createReconnectInterval()
        }
    }

    createReconnectInterval(interval: number = 3000) {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = setTimeout(async () => {
            console.log('discord-rpc: will try to reconnect every 3 seconds')

            if (!this.client.isConnected) {
                await this.connect()
            }
        }, interval)
    }

    setActivity(metadata: TrackMetadata) {
        console.log('discord-rpc: setting Discord activity')
        console.log(this.player.playbackTime)
        this.client.user?.setActivity({
            type: 2,
            details: metadata['name'],
            state: `by ${metadata['artistName']}`,
            largeImageKey: metadata.artwork.url.replace('{w}', metadata.artwork.width.toString()).replace('{h}', metadata.artwork.height.toString()),
            largeImageText: metadata['albumName'],
            //smallImageKey: 'play',
            //smallImageText: 'fweqfwefqw',
            startTimestamp: Date.now() - secToMillis(this.player.playbackTime),
            endTimestamp: Date.now() + (metadata.durationInMillis - secToMillis(this.player.playbackTime)),
            instance: false
        })
    }

    unload() {
        throw new Error('Method not implemented')
    }
}