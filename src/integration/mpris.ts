import { MKPlaybackState, MKRepeatMode } from '../@types/enums';
import { PlayerIntegration, TrackMetadata } from '../@types/interfaces';
import { LoopStatus, PlaybackStatus } from '../mpris/enums';
import { MPRISService } from '../mpris/service';
import { Player } from '../player';
import { secToMicro } from '../utils';

export class MPRISIntegration implements PlayerIntegration {
    player: Player
    mpris: MPRISService

    constructor(player: Player) {
        this.player = player
        this.mpris = new MPRISService()
    }

    load(): void {
        console.log('MPRIS initalized')
        this.mpris.on('playpause', () => this.player.playPause())
        this.mpris.on('play', () => this.player.play())
        this.mpris.on('pause', () => this.player.pause())
        this.mpris.on('stop', () => this.player.stop())
        this.mpris.on('seek', (progress) => this.player.seek(progress))
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

        this.player.on('nowPlaying', (data: TrackMetadata) => {
            if (Object.keys(data).length === 0) {
                this.mpris.setMetadata({})
                this.mpris.setPlaybackStatus(PlaybackStatus.Stopped)
                return

            }
            this.mpris.setMetadata({
                'mpris:trackid': '/org/mpris/MediaPlayer2/Track/1',
                'mpris:length': data.durationInMillis * 1000,
                'mpris:artUrl': data.artwork.url.replace('{w}', data.artwork.width.toString()).replace('{h}', data.artwork.height.toString()),
                'xesam:title': data.name,
                'xesam:album': data.albumName,
                'xesam:artist': [data.artistName],
                'xesam:trackNumber': data.trackNumber,
                'xesam:discNumber': data.discNumber,
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

        this.player.on('playbackTime', data => {
            const position = data['position']
            this.mpris.setPosition(secToMicro(position))
        })

        this.player.on('shuffle', ({ mode }) => {
            console.log('Shuffle:', mode)
            this.mpris.setShuffle(mode)
        })

        this.player.on('repeat', ({ mode }) => {
            console.log('Repeat:', mode)
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