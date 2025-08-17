(() => {
    window.isMKHooked = false
    let hookMusicKit = async () => {
        console.log('starting to listen for musickit events')

        if (window.isMKHooked) {
            document.removeEventListener('musickitconfigured', listener)
        }

        //const amPlayer = document.querySelector("#apple-music-player")
        const ipcRenderer = window.AMWrapper.ipcRenderer
        const areWeClassical = window.location.hostname.includes('classical')

        const MusicKit = window.MusicKit
        const instance = MusicKit.getInstance();
        console.log(instance)
        instance.bitrate = MusicKit.PlaybackBitrate.HIGH
        instance.previewOnly = false
    
        ipcRenderer.on('playpause', () => {
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
    
        ipcRenderer.on('nextTrack', async () => instance.skipToNextItem())
        ipcRenderer.on('previousTrack', async () => instance.skipToPreviousItem())
        ipcRenderer.on('playbackTime', async (event, data) => instance.seekToTime(data.progress))
        ipcRenderer.on('shuffle', async (event, data) => {
            instance.shuffleMode = data.mode ? 1 : 0
        })
        ipcRenderer.on('repeat', async (event, data) => {
            instance.repeatMode = MusicKit.PlayerRepeatMode[data['mode']]
        })
    
        function getAlbumData(response) {
            const data = response['data']
            console.log('getAlbumData', data)
            let albumData = null
    
            try {
                albumData = data[0]['relationships']['albums']['data'][0]['attributes']
            } catch {
                try {
                    albumData = data[0]['attributes']
                } catch {
                    return instance.nowPlayingItem.attributes
                }
            }
            return albumData
        }
    
        instance.addEventListener('nowPlayingItemDidChange', async data => {
            console.log('nowPlayingItemDidChange', data)
            const mediaItem = data['item']
            if (mediaItem && mediaItem['attributes']) {
                ipcRenderer.send('nowPlaying', mediaItem['attributes'] || {})

                if (!areWeClassical) {
                    // regex kanged from musickit (this checks if the playing item is in the user's library)
                    if (/^[a|i|l|p]{1}\.[a-zA-Z0-9]+$/.test(mediaItem['id'])) {
                        console.log('sending album data')
                        const libraryData = await instance.api.v3.music(`/v1/me/library/songs/${mediaItem['id']}`, { include: 'albums' })
                        const response = await libraryData['data']
                        const albumData = getAlbumData(response)
                        console.log('albumData', albumData)
                        ipcRenderer.send('nowPlayingAlbumData', albumData)
                    } else {
                        console.log('sending album data')
                        const catalogData = await instance.api.v3.music(`/v1/catalog/{{storefrontId}}/songs/${mediaItem['id']}`, { include: 'albums' })
                        const response = await catalogData['data']
                        const albumData = getAlbumData(response)
                        console.log('albumData', albumData)
                        ipcRenderer.send('nowPlayingAlbumData', albumData)
                    }
                } else {
                    ipcRenderer.send('nowPlayingAlbumData', null)
                }
            }
        })
    
        instance.addEventListener('playbackTimeDidChange', async () => {
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
    }

    let listener = document.addEventListener('musickitconfigured', async () => {
        if (window.isMKHooked) {
            console.log('already hooked to musickit, removing listener...')
            document.removeEventListener('musickitconfigured', listener)
            return
        }

        window.isMKHooked = true
        console.log('hooking musickit...')
        await hookMusicKit()
    })

    console.log('listening for musickit configuration')

    // just in case
    const interval = setInterval(async () => {
        console.log('is mk hooked', window.isMKHooked)
        if (!window.isMKHooked) {
            console.log('hooking musickit... (interval)')
            await hookMusicKit()
            window.isMKHooked = true
        }
        clearInterval(interval)
    }, 5000)
})()