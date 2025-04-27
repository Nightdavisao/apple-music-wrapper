export interface PlayerIntegration {
    load(): Promise<void> | void
    unload(): Promise<void> | void
}

export interface Artwork {
    width: number;
    height: number;
    url: string;
}

export interface PlayParams {
    id: string;
    kind: string;
    isLibrary: boolean;
    reporting: boolean;
    catalogId: string;
    reportingId: string;
}

export interface TrackMetadata {
    albumName: string;
    discNumber: number;
    genreNames: string[];
    trackNumber: number;
    hasLyrics: boolean;
    releaseDate: string; // Pode ser convertido para Date se preferir
    durationInMillis: number;
    name: string;
    contentRating: string;
    artistName: string;
    artwork: Artwork;
    playParams: PlayParams;
    isrc: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previews: any[]; // Defina um tipo específico se a estrutura dos previews for conhecida
}


export interface AppOptions {
    [key: string]: never;
}