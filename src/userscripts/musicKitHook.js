document.addEventListener('musickitconfigured', async () => {
    console.log('MusicKit loaded')
    const amPlayer = document.querySelector("#apple-music-player")
    const ipcRenderer = window.AMWrapper.ipcRenderer

    const MusicKit = window.MusicKit
    const instance = MusicKit.getInstance();
    console.log(instance)
    instance.bitrate = MusicKit.PlaybackBitrate.HIGH
    instance.previewOnly = false

    ipcRenderer.on('playpause', async (event, data) => {
        if (instance.playbackState === MusicKit.PlaybackStates.playing) {
            instance.pause()
        } else {
            instance.play()
        }
    })

    ipcRenderer.on('playbackState', async (event, data) => {
        switch (data.state) {
            case 'playing':
                instance.play()
                break
            case 'paused':
                instance.pause()
                break
            case 'stopped':
                instance.stop()
                break
        }
    })

    ipcRenderer.on('nextTrack', async (event, data) => instance.skipToNextItem())
    ipcRenderer.on('previousTrack', async (event, data) => instance.skipToPreviousItem())
    ipcRenderer.on('playbackTime', async (event, data) => instance.seekToTime(data.progress))
    ipcRenderer.on('shuffle', async (event, data) => {
        instance.shuffleMode = data.mode ? 1 : 0
    })
    ipcRenderer.on('repeat', async (event, data) => {
        instance.repeatMode = MusicKit.PlayerRepeatMode[data['mode']]
    })

    instance.addEventListener('nowPlayingItemDidChange', async data => {
        if (data['item'] && data['item']['attributes']) {
            ipcRenderer.send('nowPlaying', data['item']['attributes'] || {})
        }
    })

    instance.addEventListener('playbackTimeDidChange', async (event) => {
        //ipcRenderer.send('musickit:playbackProgressDidChange', event)
        if (instance['currentPlaybackTime']) {
            ipcRenderer.send('playbackTime', {
                position: instance['currentPlaybackTime'],
            })
        }
    })

    instance.addEventListener('playbackStateDidChange', async ({ state }) => {
        const playbackState = MusicKit.PlaybackStates[state]
        ipcRenderer.send('playbackState', { state: playbackState })
    })

    instance.addEventListener('shuffleModeDidChange', async () => {
        const mode = instance.shuffleMode === 1
        ipcRenderer.send('shuffle', { mode })
    })

    instance.addEventListener('repeatModeDidChange', async () => {
        const mode = MusicKit.PlayerRepeatMode[instance.repeatMode]
        ipcRenderer.send('repeat', { mode })
    })
})