export const PLAYBACK_STATES = {
    "0": "none",
    "1": "loading",
    "2": "playing",
    "3": "paused",
    "4": "stopped",
    "5": "ended",
    "6": "seeking",
    "8": "waiting",
    "9": "stalled",
    "10": "completed",
    "none": 0,
    "loading": 1,
    "playing": 2,
    "paused": 3,
    "stopped": 4,
    "ended": 5,
    "seeking": 6,
    "waiting": 8,
    "stalled": 9,
    "completed": 10
};

export const secToMicro = (seconds: number) => Math.round(Number(seconds) * 1e6);
export const microToSec = (microseconds: number) => Number(microseconds) / 1e6;