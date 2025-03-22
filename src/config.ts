import { App } from "electron/main"
import { AppOptions } from "./@types/interfaces"
import fs from 'fs'

export class AppConfig {
    app: App
    default: AppOptions
    current: AppOptions

    constructor(app: App, defaultOptions: AppOptions) {
        this.app = app
        this.default = defaultOptions
        this.current = this._load() || defaultOptions
    }

    get(key: string) {
        if (this.current.hasOwnProperty(key))
            return this.current[key]
        
        return this.default[key]
    }

    set(key: string, value: any) {
        this.current[key] = value
        this._save()
    }

    private _save() {
        const userData = this.app.getPath('userData')
        const configFile = `${userData}/config.json`
        try {
            console.log('Saving config file', configFile)
            fs.writeFileSync(configFile, JSON.stringify(this.current, null, 4))
        }
        catch (error) {
            console.error('Error saving config file', error)
        }
    }

    private _load() {
        const userData = this.app.getPath('userData')
        const configFile = `${userData}/config.json`
        console.log('Loading config file', configFile)
        
        try {
            const data = fs.readFileSync(configFile, 'utf8')
            console.log('Config file loaded', data)

            return JSON.parse(data)
        }
        catch (error) {
            console.error('Error loading config file', error)
        }
    }
}