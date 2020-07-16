// Helper functions for generating pet sound effects and SSML
const pets = {
    RASCAL: {
        sound: "soundbank://soundlibrary/animals/amzn_sfx_dog_med_bark_1x_02",
        voice: (text) => `<voice name='Matthew'><prosody rate='fast'>${text}</prosody></voice>`
    },
    BONBON: {
        sound: "soundbank://soundlibrary/animals/amzn_sfx_dog_med_bark_1x_01",
        voice: (text) => `<voice name='Celine'>${text}</voice>`
    },
    LARRY: {
        sound: "soundbank://soundlibrary/animals/amzn_sfx_dog_med_bark_2x_02",
        voice: (text) => `<voice name='Enrique'><prosody rate='slow'>${text}</prosody></voice>`
    },
    CHESTER: {
        sound: "soundbank://soundlibrary/animals/amzn_sfx_cat_meow_1x_01",
        voice: (text) => `<voice name='Brian'><prosody pitch='low'>${text}</prosody></voice>`
    },
    BELLE: {
        sound: "soundbank://soundlibrary/animals/amzn_sfx_cat_long_meow_1x_01",
        voice: (text) => `<voice name='Joanna'><prosody pitch='low'>${text}</prosody></voice>`
    },
    KOKO: {
        sound: "soundbank://soundlibrary/animals/amzn_sfx_cat_meow_1x_02",
        voice: (text) => `<voice name='Sally'><prosody rate='fast'>${text}</prosody></voice>`
    },
    SCALES: {
        sound: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/audio/snake.mp3",
        voice: (text) => `<voice name='Russell'><prosody rate='slow'>${text}</prosody></voice>`
    },
    FEATHERS: {
        sound: "soundbank://soundlibrary/animals/amzn_sfx_bird_chickadee_chirp_1x_01",
        voice: (text) => `<voice name='Emma'><prosody pitch='high'>${text}</prosody></voice>`
    },
    HOPS: {
        sound: "soundbank://soundlibrary/alarms/beeps_and_bloops/boing_01",
        voice: (text) => `<voice name='Ivy'>${text}</voice>`
    }
}

function getPetAudio(petName) {
    return {
        type: 'Audio',
        source: pets[petName].sound
    }
}

function getPetVoice(petName, text) {
    return {
        type: 'Speech',
        contentType: 'SSML',
        content: `<speak>${pets[petName].voice(text)}</speak>`
    }
}

module.exports = {
    getPetVoice,
    getPetAudio
}