import dbus from 'dbus-next'
import { EventEmitter } from 'events'
import { MediaPlayer2PlayerInterface, MediaPlayer2Interface } from './interface'
import { LoopStatus, PlaybackStatus } from './enums'

export class MPRISService extends EventEmitter {
    initalized: boolean
    bus: dbus.MessageBus | null
    interface: MediaPlayer2Interface | null
    playerInterface: MediaPlayer2PlayerInterface | null
    //playerEvents: string[]
    constructor() {
        super()
        this.initalized = false
        this.bus = null
        this.interface = null
        this.playerInterface = null
        this._init()
        //this.playerEvents = ['play', 'pause', 'previous', 'next', 'playpause', 'stop', 'seek', 'setposition', 'openuri']
    }
    private async _init() {
        this.bus = dbus.sessionBus()
        this.interface = new MediaPlayer2Interface(this)
        this.playerInterface = new MediaPlayer2PlayerInterface(this)
        this.bus.export('/org/mpris/MediaPlayer2', this.interface)
        this.bus.export('/org/mpris/MediaPlayer2', this.playerInterface)
        
        try {
            const returnCode = await this.bus.requestName(`org.mpris.MediaPlayer2.amwrapper`, dbus.NameFlag.DO_NOT_QUEUE)
            console.log('Return code:', returnCode)
            if (returnCode != dbus.RequestNameReply.PRIMARY_OWNER) {
                console.error('Could not acquire D-Bus name')
            }
        } catch(e) {
            console.error('Error acquiring D-Bus name:', e)
        }

        process.on('SIGINT', () => {
            console.log('disconnecting from dbus')
            this.initalized = false
            this.bus?.disconnect()
        })

        this.emit('initalized')
        this.initalized = true
    }


    private guessMetadataSignature(key: string, value: any): string | null {
        switch (true) {
            case key === 'mpris:trackid':
                return 'o';
            case key === 'mpris:length':
                return 'x';
            case typeof value === 'string':
                return 's';
            case typeof value === 'boolean':
                return 'b';
            case typeof value === 'number':
                return 'd';
            case Array.isArray(value) && value.every((v) => typeof v === 'string'):
                return 'as';
            default:
                return null;
        }
    }

    setMetadata(metadata: object) {
        if (this.initalized && this.playerInterface) {
            try {
                const newMetadata: Record<string, dbus.Variant> = {}
    
                for (const [key, value] of Object.entries(metadata)) {
                    const signature = this.guessMetadataSignature(key, value);
                    if (signature) {
                        newMetadata[key] = new dbus.Variant(signature, value);
                    }
                }
                console.log('Setting metadata:', newMetadata)
                this.playerInterface.Metadata = newMetadata;
            } catch (error) {
                console.error('MPRIS service: Error setting metadata:', error)
            } 
        }
    }

    setPlaybackStatus(status: PlaybackStatus) {
        console.log('MPRIS service: Setting playback status:', status)
        if (this.initalized && this.playerInterface) this.playerInterface.PlaybackStatus = status
    }

    setPosition(position: number) {
        //console.log('MPRIS service: Setting position:', position)
        if (this.initalized && this.playerInterface) this.playerInterface.Position = position
    }

    setLoopStatus(status: LoopStatus) {
        console.log('MPRIS service: Setting loop status:', status)
        if (this.initalized && this.playerInterface) this.playerInterface.LoopStatus = status
    }

    setShuffle(shuffle: boolean) {
        console.log('MPRIS service: Setting shuffle:', shuffle)
        if (this.initalized && this.playerInterface) this.playerInterface.Shuffle = shuffle
    }
}