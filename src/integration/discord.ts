import { Client } from "@xhayper/discord-rpc"
import { Player } from "../player"
import { TrackMetadata, PlayerIntegration } from "../@types/interfaces"
import { MKPlaybackState } from "../@types/enums"
import { secToMillis, getArtworkUrl } from "../utils"
import { Logger } from "log4js"
import log4js from "log4js"

export class DiscordIntegration implements PlayerIntegration {
    logger: Logger
    player: Player
    client: Client
    wasPaused: boolean
    reconnectTimeout: NodeJS.Timeout | null
    constructor(player: Player) {
        this.logger = log4js.getLogger('discord-integration')
        this.logger.level = 'debug'
        this.player = player
        this.client = new Client({ clientId: '1350945271827136522' })
        this.wasPaused = false
        this.reconnectTimeout = null
    }

    async load() {
        this.client.on('ready', () => {
            this.logger.info('discord RPC ready')
        })

        this.player.on('nowPlaying', (metadata: TrackMetadata) => this.setActivity(metadata))
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
        this.player.on('playbackTime', async () => {
            if (this.player.metadata && this.wasPaused) {
                await this.setActivity(this.player.metadata)
                this.wasPaused = false
            }
        })
        this.client.on('disconnected', () => {
            this.logger.info('disconnected from Discord RPC')
            this.createReconnectInterval()
        })
        await this.connect()
    }

    async connect() {
        try {
            await this.client.login()
        } catch {
            this.createReconnectInterval()
        }
    }

    createReconnectInterval(interval: number = 3000) {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = setTimeout(async () => {
            if (!this.client.isConnected) {
                await this.connect()
            }
        }, interval)
    }

    async setActivity(metadata: TrackMetadata) {
        if (!this.client.isConnected) return

        this.logger.info('setting Discord activity')

        const artwork = getArtworkUrl(metadata)
        const artworkUrl = artwork.length <= 256 ? artwork : ''
        await this.client.user?.setActivity({
            type: 2,
            details: metadata['name'],
            state: `by ${metadata['artistName']}`,
            largeImageKey: artworkUrl,
            largeImageText: metadata['albumName'],
            //smallImageKey: 'play',
            //smallImageText: 'fweqfwefqw',
            startTimestamp: Date.now() - secToMillis(this.player.playbackTime),
            endTimestamp: Date.now() + (metadata.durationInMillis - secToMillis(this.player.playbackTime)),
            instance: false
        })
    }

    unload() {
        // todo: properly unload
        //this.player.off('nowPlaying', this.setActivityBound)

        if (this.client.isConnected) {
            this.client.removeAllListeners()
            this.client.destroy()
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
        }
    }
}