const _ = require('lodash');

// Define the types of animals available
// Make sure these values reflect the corresponding "AnimalType" custom slot ID in the interaction model
const types = {
  DOG: "dog",
  CAT: "cat",
  RARE: "rare_collection"
};

// Define each animal available
// The "name" field should correspond with the IDs defined in the "Name" custom slot
// "name" and "breed" are keys to translations in resources
const pets = [
    {
        name: "RASCAL",
        type: types.DOG,
        breed: "BEAGLE",
        sound: "soundbank://soundlibrary/animals/amzn_sfx_dog_med_bark_1x_02",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Rascal.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Rascal_Sleep.png"
    },
    {
        name: "BONBON",
        type: types.DOG,
        breed: "POODLE",
        sound: "soundbank://soundlibrary/animals/amzn_sfx_dog_med_bark_1x_01",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Bonbon.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Bonbon_Sleep.png"
    },
    {
        name: "LARRY",
        type: types.DOG,
        breed: "CHIHUAHUA",
        sound: "soundbank://soundlibrary/animals/amzn_sfx_dog_med_bark_2x_02",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Larry.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Larry_Sleep.png"
    },
    {
        name: "CHESTER",
        type: types.CAT,
        breed: "BRITISH_SHORTHAIR",
        sound: "soundbank://soundlibrary/animals/amzn_sfx_cat_meow_1x_01",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Chester.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Chester_Sleep.png"
    },
    {
        name: "BELLE",
        type: types.CAT,
        breed: "RAGDOLL",
        sound: "soundbank://soundlibrary/animals/amzn_sfx_cat_long_meow_1x_01",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Belle.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Belle_Sleep.png"
    },
    {
        name: "KOKO",
        type: types.CAT,
        breed: "KORAT",
        sound: "soundbank://soundlibrary/animals/amzn_sfx_cat_meow_1x_02",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Koko.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Koko_Sleep.png"
    },
    {
        name: "SCALES",
        type: types.RARE,
        breed: "SNAKE",
        sound: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/audio/snake.mp3",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Scales.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Scales_Sleep.png"
    },
    {
        name: "FEATHERS",
        type: types.RARE,
        breed: "BIRD",
        sound: "soundbank://soundlibrary/animals/amzn_sfx_bird_chickadee_chirp_1x_01",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Feathers.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Feathers_Sleep.png"
    },
    {
        name: "HOPS",
        type: types.RARE,
        breed: "BUNNY",
        sound: "soundbank://soundlibrary/alarms/beeps_and_bloops/boing_01",
        awakeSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Hops.png",
        sleepSrc: "https://veoxmbq.s3.amazonaws.com/pet-tales/assets/Characters/png/Hops_Sleep.png"
    }
];

// A helper for managing and adopting pets
class PetShopService {

    constructor(handlerInput) {
        this.handlerInput = handlerInput;
    }

    // Returns a set of animal types with one or more pets still available for adoption
    async getAvailableTypes() {
        const availablePets = await this.getAvailablePets();
        return _.uniq(_.map(availablePets, (a) => a.type));
    }

    // Returns a list of animals still available for adoption
    async getAvailablePets() {
        const persistentAttributes = await this.handlerInput.attributesManager.getPersistentAttributes();
        const {adoptedPets} = persistentAttributes;
        const unavailablePetNames = _.map(adoptedPets, (pet) => {
            return pet.name;
        });

        return _.filter(pets, (pet) => {
            return !_.includes(unavailablePetNames, pet.name);
        });
    }

    // Returns a list of animals of a given type available for adoption
    async getAvailablePetsByType(type) {
        const availablePets = await this.getAvailablePets();
        return _.filter(availablePets, (pet) => {
            return pet.type === type;
        });
    }

    // Returns a list of all pet sounds
    getAllPetSounds() {
        return _.map(pets, (pet) => {
            return pet.sound;
        });
    }

    // Returns a list of sounds each animal makes
    getPetSoundsByType(type) {
        return _.map(_.filter(pets, (pet) => {
           return pet.type === type;
        }), (pet) => {
            return pet.sound;
        });
    }

    // Returns pet metadata for the given name
    getPet(name) {
        return _.find(pets, (pet) => {
            return pet.name === name;
        });
    }

    // Returns true if a pet is available for adoption
    async isAvailableForAdoption(name) {
        const availablePets = await this.getAvailablePets();
        return _.includes(_.map(availablePets, (pet) => {
            return pet.name;
        }), name);
    }

    async adoptPet(pet) {
        const persistentAttributes = await this.handlerInput.attributesManager.getPersistentAttributes();
        _.defaults(persistentAttributes, {
            adoptedPets: []
        });
        persistentAttributes.adoptedPets.push(pet);

        // To keep this sample simple, we are only allowing a max of four adopted pets
        // Least recently adopted pet is the first to be sent back to the pet shop if this max is exceeded
        let petSentBack;
        if (persistentAttributes.adoptedPets.length > 4) {
            petSentBack = persistentAttributes.adoptedPets.shift();
            console.log("Sending back the least recently adopted pet:", petSentBack.name);
        }

        await this.handlerInput.attributesManager.savePersistentAttributes();
        return petSentBack;
    }

    async getAdoptedPets() {
        const persistentAttributes = await this.handlerInput.attributesManager.getPersistentAttributes();
        return persistentAttributes.adoptedPets || [];
    }
    
}

module.exports = PetShopService;