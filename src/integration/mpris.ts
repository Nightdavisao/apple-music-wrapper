import { MKPlaybackState, MKRepeatMode } from '../@types/enums';
import { PlayerIntegration, TrackMetadata } from '../@types/interfaces';
import { LoopStatus, PlaybackStatus } from '../mpris/enums';
import { MPRISService } from '../mpris/service';
import { Player } from '../player';
import { getArtworkUrl, microToSec, secToMicro } from '../utils';
import { Logger } from 'log4js';
import log4js from 'log4js'

export class MPRISIntegration implements PlayerIntegration {
    logger: Logger
    player: Player
    mpris: MPRISService

    constructor(player: Player) {
        this.logger = log4js.getLogger('mpris-integration')
        this.logger.level = 'debug'
        this.player = player
        this.mpris = new MPRISService()
    }

    load(): void {
        this.mpris.on('playpause', () => this.player.playPause())
        this.mpris.on('play', () => this.player.play())
        this.mpris.on('pause', () => this.player.pause())
        this.mpris.on('stop', () => this.player.stop())
        this.mpris.on('seek', (offset) => this.player.seek(this.player.playbackTime + microToSec(offset)))
        this.mpris.on('setposition', (trackId, position) => this.player.seek(microToSec(position)))
        this.mpris.on('next', () => this.player.next())
        this.mpris.on('previous', () => this.player.previous())
        this.mpris.on('shuffle', (data) => this.player.setShuffle(data.state))
        this.mpris.on('loop', ({ state }) => {
            switch (state) {
                case LoopStatus.Track:
                    this.player.setRepeat(MKRepeatMode.One)
                    break
                case LoopStatus.Playlist:
                    this.player.setRepeat(MKRepeatMode.All)
                    break
                case LoopStatus.None:
                default:
                    this.player.setRepeat(MKRepeatMode.None)
                    break
            }
        })

        this.player.on('nowPlaying', (metadata: TrackMetadata) => {
            if (Object.keys(metadata).length === 0) {
                this.mpris.setMetadata({})
                this.mpris.setPlaybackStatus(PlaybackStatus.Stopped)
                return

            }
            this.mpris.setMetadata({
                'mpris:trackid': '/org/mpris/MediaPlayer2/Track/1',
                'mpris:length': metadata.durationInMillis * 1000,
                'mpris:artUrl': getArtworkUrl(metadata),
                'xesam:title': metadata.name,
                'xesam:album': metadata.albumName,
                'xesam:artist': [metadata.artistName],
                'xesam:trackNumber': metadata.trackNumber,
                'xesam:discNumber': metadata.discNumber,
            })
        })

        this.player.on('playbackState', ({ state }) => {
            switch (state) {
                case MKPlaybackState.Playing:
                    this.mpris.setPlaybackStatus(PlaybackStatus.Playing)
                    break
                case MKPlaybackState.Paused:
                    this.mpris.setPlaybackStatus(PlaybackStatus.Paused)
                    break
                case MKPlaybackState.Stopped:
                    this.mpris.setPlaybackStatus(PlaybackStatus.Stopped)
                    break
            }
        })

        this.player.on('playbackTime', ({ position }) => this.mpris.setPosition(secToMicro(position)))
        this.player.on('shuffle', ({ mode }) => this.mpris.setShuffle(mode))

        this.player.on('repeat', ({ mode }) => {
            switch (mode) {
                case MKRepeatMode.None:
                    this.mpris.setLoopStatus(LoopStatus.None)
                    break
                case MKRepeatMode.All:
                    this.mpris.setLoopStatus(LoopStatus.Playlist)
                    break
                case MKRepeatMode.One:
                    this.mpris.setLoopStatus(LoopStatus.Track)
                    break
            }
        })
    }
    unload(): void {
        throw new Error('Method not implemented.');
    }
}