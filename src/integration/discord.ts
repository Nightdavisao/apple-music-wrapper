import { Client } from "@xhayper/discord-rpc"
import { Player } from "../player"
import { TrackMetadata } from "../@types/interfaces"
import { MKPlaybackState } from "../@types/enums"
import { secToMicro, secToMillis } from "../utils"

export class DiscordIntegration {
    player: Player
    client: Client
    constructor(player: Player) {
        this.player = player
        this.client = new Client({ clientId: '1350945271827136522' })
    }

    load() {
        this.client.on('ready', () => {
            console.log('Discord RPC connected')
            //this.player.on('nowPlaying', (metadata: TrackMetadata) => this.setActivity(metadata))
            this.player.on('playbackState', ({ state }) => {
                switch (state) {
                    case MKPlaybackState.Playing:
                        if (this.player.metadata) this.setActivity(this.player.metadata)
                        break
                    case MKPlaybackState.Stopped:
                    case MKPlaybackState.Paused:
                    default:
                        this.client.user?.clearActivity()
                        break
                }
            })
        })
        this.client.login()
    }

    setActivity(metadata: TrackMetadata) {
        console.log('Setting Discord activity')
        console.log(this.player.playbackTime)
        this.client.user?.setActivity({
            type: 2,
            details: metadata['name'],
            state: `by ${metadata['artistName']}`,
            largeImageKey: metadata.artwork.url.replace('{w}', metadata.artwork.width.toString()).replace('{h}', metadata.artwork.height.toString()),
            largeImageText: metadata['albumName'],
            smallImageKey: 'play',
            smallImageText: 'fweqfwefqw',
            startTimestamp: Date.now() - secToMillis(this.player.playbackTime),
            endTimestamp: Date.now() + (metadata.durationInMillis - secToMillis(this.player.playbackTime)),
            instance: false
        })
    }

    unload() {
        console.log('Discord unloaded')
    }
}