import { PlayerIntegration, TrackMetadata } from '../@types/interfaces';
import { MKPlaybackState } from '../@types/enums';
import { LastFMClient } from '../lastfm/client';
import { LastFMScrubbler } from '../lastfm/scrubbler';
import { Player } from '../player';
import { millisToSec } from '../utils';


export class LastFMIntegration implements PlayerIntegration {
    player: Player
    scrubbler: LastFMScrubbler
    wasScrobbled: boolean
    lastPlayingStatusTimestamp: Date | null
    constructor(player: Player, lastFmClient: LastFMClient, userToken: string) {
        this.player = player
        this.scrubbler = new LastFMScrubbler(lastFmClient, userToken)
        this.wasScrobbled = false
        this.lastPlayingStatusTimestamp = null
    }

    async load() {
        this.player.on('nowPlaying', async (data: TrackMetadata) => {
            console.log('lastfm: nowPlaying', data)
            this.wasScrobbled = false
            this.lastPlayingStatusTimestamp = null

            await this.scrubbler.updateNowPlaying(data.artistName,
                data.name,
                data.albumName,
                null,
                data.trackNumber,
                millisToSec(data.durationInMillis)
            )
        })

        this.player.on('playbackState', ({ state }) => {
            switch (state) {
                case MKPlaybackState.Playing:
                    this.lastPlayingStatusTimestamp = new Date()
                    break
                case MKPlaybackState.Stopped:
                case MKPlaybackState.Paused:
                    this.lastPlayingStatusTimestamp = null
                    break
            }
        })

        this.player.on('playbackTime', async data => {
            const metadata = this.player.metadata
            if (metadata) {
                const durationSecs = millisToSec(metadata.durationInMillis)
                const maxDuration = (4 * 60 * 60)
                const howMuchToPlay = durationSecs > maxDuration ? maxDuration : durationSecs / 2
                
                const currentTimestamp = new Date()

                if (!this.lastPlayingStatusTimestamp) return

                if (!this.wasScrobbled && (currentTimestamp.getTime() > this.lastPlayingStatusTimestamp.getTime() + howMuchToPlay * 1000)) {
                    console.log('last.fm: scrobbling current track')
                    const response = await this.scrubbler.scrobble(metadata.artistName,
                        metadata.name,
                        currentTimestamp.getTime(),
                        metadata.albumName, null,
                        metadata.trackNumber,
                        millisToSec(metadata.durationInMillis))

                    if (!response.error) this.wasScrobbled = true

                    console.log('last.fm:', response)
                }
            }
        })
    }
    unload(): Promise<void> | void {
        throw new Error('Method not implemented.');
    }

}