import { PlayerIntegration, TrackMetadata } from '../@types/interfaces';
import { MKPlaybackState } from '../@types/enums';
import { LastFMClient } from '../lastfm/client';
import { LastFMScrubbler } from '../lastfm/scrubbler';
import { Player } from '../player';
import { millisToSec, sanitizeName } from '../utils';


export class LastFMIntegration implements PlayerIntegration {
    player: Player
    scrubbler: LastFMScrubbler
    currentTrack: {
        albumArtist: string
        artistTrack: string
        albumName: string
        trackName: string
        trackNumber: number
        duration: number
    } | null
    wasScrobbled: boolean
    wasIgnored: boolean
    didFail: boolean
    threadLocked: boolean
    lastPlayingStatusTimestamp: Date | null
    constructor(player: Player, lastFmClient: LastFMClient, userToken: string) {
        this.player = player
        this.currentTrack = null
        this.scrubbler = new LastFMScrubbler(lastFmClient, userToken)
        this.wasScrobbled = false
        this.wasIgnored = false
        this.didFail = false
        this.threadLocked = false

        this.lastPlayingStatusTimestamp = null
    }

    async load() {
        this.player.on('nowPlayingAlbumData', async (albumData: {
            artistName: string
        }) => {
            const currentMetadata = this.player.metadata
            this.wasScrobbled = false
            this.wasIgnored = false
            this.didFail = false
            this.lastPlayingStatusTimestamp = null
            this.threadLocked = false

            if (currentMetadata) {
                this.currentTrack = {
                    albumArtist: albumData.artistName ?? currentMetadata.artistName,
                    artistTrack: currentMetadata.artistName,
                    albumName: currentMetadata.albumName,
                    trackName: currentMetadata.name,
                    trackNumber: currentMetadata.trackNumber,
                    duration: millisToSec(currentMetadata.durationInMillis)
                }
                console.log('lastfm: nowPlaying', this.currentTrack)

                await this.scrubbler.updateNowPlaying(
                    currentMetadata.artistName,
                    sanitizeName(currentMetadata.name),
                    sanitizeName(currentMetadata.albumName),
                    albumData.artistName,
                    currentMetadata.trackNumber,
                    millisToSec(currentMetadata.durationInMillis)
                )
            }
        })

        this.player.on('playbackState', ({ state }) => {
            this.threadLocked = false

            switch (state) {
                case MKPlaybackState.Playing:
                    this.lastPlayingStatusTimestamp = new Date()
                    break
                case MKPlaybackState.Stopped:
                    this.currentTrack = null
                    break
                case MKPlaybackState.Paused:
                    this.lastPlayingStatusTimestamp = null
                    break
            }
        })

        this.player.on('playbackTime', async ({ position }) => {
            const metadata = this.player.metadata
            if (metadata && !this.wasIgnored) {
                // should never happen but 
                if (millisToSec(metadata.durationInMillis) <= 30) {
                    console.log('last.fm: less than 30 seconds, ignoring track...')
                    this.wasIgnored = true
                    return
                }

                const durationSecs = millisToSec(metadata.durationInMillis)
                const maxDuration = 4 * 60
                const howMuchToPlay = durationSecs > maxDuration ? maxDuration : durationSecs / 2

                const currentTimestamp = new Date()

                if (!this.lastPlayingStatusTimestamp) return

                if (!this.wasScrobbled && (currentTimestamp.getTime() > this.lastPlayingStatusTimestamp.getTime() + howMuchToPlay * 1000)) {
                    if (!this.threadLocked) {
                        this.threadLocked = true
                        console.log('last.fm: acquiring lock')
                    } else {
                        return
                    }

                    try {                        
                        if (this.currentTrack) {
                            console.log('last.fm: scrobbling current track', this.currentTrack)

                            const response = await this.scrubbler.scrobble(
                                this.currentTrack.artistTrack,
                                sanitizeName(this.currentTrack.trackName),
                                currentTimestamp.getTime(),
                                sanitizeName(this.currentTrack.albumName),
                                this.currentTrack.albumArtist,
                                this.currentTrack.trackNumber,
                                this.currentTrack.duration
                            )

                            if (response['scrobbles']['@attr']['ignored'] === 1) {
                                this.wasIgnored = true
                            }

                            if (!response.error) {
                                this.wasScrobbled = true
                            } else {
                                this.didFail = true
                            }

                            console.log('last.fm: on scrobbling', JSON.stringify(response))

                            this.player.emit('lfm:scrobble')
                        }
                        this.threadLocked = false
                    } catch (e) {
                        console.error('last.fm: failed to scrobble, releasing lock', e)
                        this.threadLocked = false
                    }
                }
            }
        })
    }
    unload(): Promise<void> | void {
        throw new Error('Method not implemented.');
    }

}