import { PlayerIntegration } from '../@types/interfaces';
import { MKPlaybackState, WebsiteType } from '../@types/enums';
import { LastFMClient } from '../lastfm/client';
import { LastFMScrubbler } from '../lastfm/scrubbler';
import { Player } from '../player';
import { millisToSec, sanitizeName } from '../utils';
import { Logger } from 'log4js';
import log4js from 'log4js';
export class LastFMIntegration implements PlayerIntegration {
    logger: Logger
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
    activeWebsite: WebsiteType;
    isClassical: boolean;
    constructor(player: Player, activeWebsite: WebsiteType, lastFmClient: LastFMClient, userToken: string) {
        this.logger = log4js.getLogger('lastfm-integration')
        this.logger.level = 'debug'
        this.activeWebsite = activeWebsite
        this.isClassical = activeWebsite === WebsiteType.Classical
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
            artistName: string | null
        } | null ) => {
            const currentMetadata = this.player.metadata
            this.wasScrobbled = false
            this.wasIgnored = false
            this.didFail = false
            this.lastPlayingStatusTimestamp = null
            this.threadLocked = false

            if (currentMetadata) {
                this.currentTrack = {
                    albumArtist: !this.isClassical ? (albumData?.artistName ?? currentMetadata.artistName) : currentMetadata.composerName,
                    artistTrack: !this.isClassical ? currentMetadata.artistName : currentMetadata.composerName,
                    albumName: currentMetadata.albumName,
                    trackName: currentMetadata.name,
                    trackNumber: currentMetadata.trackNumber,
                    duration: millisToSec(currentMetadata.durationInMillis)
                }
                
                await this.scrubbler.updateNowPlaying(
                    this.currentTrack.artistTrack,
                    sanitizeName(this.currentTrack.trackName),
                    sanitizeName(this.currentTrack.albumName),
                    this.currentTrack.albumArtist,
                    this.currentTrack.trackNumber,
                    this.currentTrack.duration
                )
                this.logger.info('updating now playing')
            } else {
                this.logger.warn('no current metadata available')
            }
        })

        this.player.on('playbackState', ({ state }) => {
            this.threadLocked = false

            switch (state) {
                case MKPlaybackState.Stopped:
                    this.currentTrack = null
                    break
            }
        })

        this.player.on('playbackTime', async ({ position }) => {
            const metadata = this.player.metadata
            if (metadata && !this.wasIgnored) {
                // should never happen but 
                if (millisToSec(metadata.durationInMillis) <= 30) {
                    this.logger.info('less than 30 seconds, ignoring track...')
                    this.wasIgnored = true
                    return
                }

                const durationSecs = millisToSec(metadata.durationInMillis)
                const maxDuration = 4 * 60
                const howMuchToPlay = durationSecs > maxDuration ? maxDuration : durationSecs / 2
                //console.log(`last.fm: howMuchToPlay: ${howMuchToPlay}`)

                if (!this.wasScrobbled && (position > howMuchToPlay)) {
                    if (!this.threadLocked) {
                        this.threadLocked = true
                        this.logger.debug('acquiring lock')
                    } else {
                        return
                    }

                    try {
                        if (this.currentTrack) {
                            this.logger.info('scrobbling current track', this.currentTrack)

                            const currentTimestamp = new Date()
                            const scrobblePromise = async (currentTrack: {
                                albumArtist: string
                                artistTrack: string
                                albumName: string
                                trackName: string
                                trackNumber: number
                                duration: number
                            }) => {
                                const response = await this.scrubbler.scrobble(
                                    currentTrack.artistTrack,
                                    sanitizeName(currentTrack.trackName),
                                    currentTimestamp.getTime(),
                                    sanitizeName(currentTrack.albumName),
                                    currentTrack.albumArtist,
                                    currentTrack.trackNumber,
                                    currentTrack.duration
                                )

                                if (response['scrobbles']['@attr']['ignored'] === 1) {
                                    this.wasIgnored = true
                                }
    
                                if (!response.error) {
                                    this.wasScrobbled = true
                                } else {
                                    this.didFail = true
                                }
    
                                this.logger.debug('scrobbling response', response)
    
                                this.player.emit('lfm:scrobble')
                            }
                            const timeout = new Promise((_resolve, reject) =>
                                setTimeout(() => reject(new Error('Scrobble timed out')), 10_000)
                            );

                            await Promise.race([scrobblePromise(this.currentTrack), timeout])
                        } else {
                            throw new Error('current track is null/undefined')
                        }
                    } catch (e) {
                        console.error('last.fm: failed to scrobble', e)
                    } finally {
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