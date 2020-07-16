const Alexa = require('ask-sdk'); // Library for developing Alexa skills
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter'); // Adapter to connect with S3 for persistence of user data across sessions
const i18next = require('i18next'); // Localization client initialized below in an interceptor
const _ = require('lodash'); // Library for simplifying common tasks
const moment = require('moment-timezone'); // Used to calculate the user's time of day

// Utilities for common functions
const utils = require('./utils');
const {
    isRequestType,
    isIntentRequestWithIntentName,
    isOneOfIntentNames,
    isYes,
    isNo
} = utils;

const languageStrings = require('./resources/languageStrings'); // Localized resources used by the localization client
const states = require('./states'); // States to help manage the flow
const {tokens, audio, visual} = require('./apl'); // APL & APL-A documents

// A service for managing pets
const PetShopService = require('./petShopService');

// Invoked when a user launches the skill or wants to play again after adopting a pet
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return isRequestType(handlerInput, 'LaunchRequest')
            || isIntentRequestWithIntentName(handlerInput, 'AMAZON.StartOverIntent')
            || isYes(handlerInput, states.PLAY_AGAIN);
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // Sound effects and visuals throughout the experience will be based on the user's time of day
        // This is fetched once per session
        const hour = await getCurrentHour(handlerInput);
        sessionAttributes.isDayTime = hour >= 7 && hour <= 21; // We say day time is between 7 AM and 9 PM
        console.log("isDayTime", sessionAttributes.isDayTime);

        // Get the user's adopted pets
        const {petShopService} = handlerInput;
        const adoptedPets = await petShopService.getAdoptedPets();

        if (_.isEmpty(adoptedPets)) {
            // User has not pets; offer to go to the pet shop
            sessionAttributes.state = states.VISIT_PET_SHOP;
            return getNoAdoptedPetsResponse(handlerInput);
        } else {
            // User has adopted pets; offer to pet one
            sessionAttributes.state = states.GIVE_PETS;
            return getAdoptedPetsResponse(handlerInput, adoptedPets);
        }
    }
};

// Returns the current hour based on the user's time zone
async function getCurrentHour(handlerInput) {
    const timeZone = await utils.getTimeZone(handlerInput);
    console.log("User's time zone:", timeZone);
    return moment.tz(timeZone).hours();
}

// Returns a response offering to take the user to the pet shop
function getNoAdoptedPetsResponse(handlerInput) {
    // Translate prompts in the user's locale
    const dataSources = {
        genericGreeting: handlerInput.t('GENERIC_GREETING'),
        askToVisitPetShop: handlerInput.t('VISIT_PET_SHOP_PROMPT')
    };

    // Add visuals if supported
    utils.addAplIfSupported(handlerInput, tokens.TITLE, visual.title);

    return handlerInput.responseBuilder
        .addDirective(utils.getAplADirective(tokens.TITLE, audio.launch_no_pets, dataSources))
        .reprompt(handlerInput.t('VISIT_PET_STORE_REPROMPT'))
        .getResponse();
}

// Returns a response offering to pet the most recently adopted animal
function getAdoptedPetsResponse(handlerInput, adoptedPets) {
    const latestPet = _.last(adoptedPets); // Get the most recently adopted pet
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.pet = latestPet;

    // Translate prompts in the user's locale
    const dataSources = {
        isDayTime: sessionAttributes.isDayTime,
        genericReturnGreeting: handlerInput.t('GENERIC_RETURN_GREETING'),
        givePets: handlerInput.t('GIVE_PETS', {name: latestPet.name}),
        adoptedPets: _.shuffle(adoptedPets)
    };

    // Add visuals if supported
    utils.addAplIfSupported(handlerInput, tokens.TITLE, visual.home, dataSources);

    return handlerInput.responseBuilder
        .addDirective(utils.getAplADirective(tokens.TITLE, audio.launch_with_pets, dataSources))
        .reprompt(handlerInput.t('GIVE_PETS_REPROMPT', {name: latestPet.name}))
        .getResponse();
}

// Invoked when a user wants to visit the pet shop
const VisitPetStoreIntentHandler = {
    canHandle(handlerInput) {
        return isIntentRequestWithIntentName(handlerInput, 'VisitPetShopIntent')
            || isYes(handlerInput, states.VISIT_PET_SHOP);
    },
    async handle(handlerInput) {
        return await getVisitPetShopResponse(handlerInput, handlerInput.t('FIRST_VISIT'));
    }
};

// Invoked when a user says no to petting an animal
const DoNotPetAnimalIntentHandler = {
    canHandle(handlerInput) {
        return isNo(handlerInput, states.GIVE_PETS);
    },
    async handle(handlerInput) {
        // Take the user back to the pet shop
        return await getVisitPetShopResponse(handlerInput, handlerInput.t('RETURN_VISIT'));
    }
};

// Returns the response when a user enters the pet shop
async function getVisitPetShopResponse(handlerInput, prefix) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Get the types of animals available for adoption
    const animalTypesAvailablePrompt = await getAvailableTypesPrompt(handlerInput);

    // Randomize a list of animal sounds to play in the background
    const {petShopService} = handlerInput;
    const pets = await petShopService.getAdoptedPets();
    const animalSounds = _.shuffle(petShopService.getAllPetSounds());

    // Translate prompts
    const dataSources = {
        prefix: prefix,
        shopKeeperGreeting: handlerInput.randomT('SHOP_KEEPER_GREETING', {
            context: _.size(pets) > 0 ? 'HAS_PETS' : null,
            animalTypesAvailable: animalTypesAvailablePrompt
        }),
        animalSounds: animalSounds,
        alexaPrompt: handlerInput.t('PET_TYPE_PROMPT')
    };

    // Add visuals if supported
    utils.addAplIfSupported(handlerInput, tokens.PET_SHOP, visual.pet_shop, {
        isDayTime: sessionAttributes.isDayTime
    });

    return handlerInput.responseBuilder
        .addDirective(utils.getAplADirective(tokens.PET_SHOP, audio.pet_shop, dataSources))
        .reprompt(handlerInput.t('ENTER_PET_STORE_REPROMPT', {
            animalTypesAvailable: animalTypesAvailablePrompt
        }))
        .getResponse();
}

// Invoked when the user selects a type of animal (ex: dogs, cats) to browse
const BrowsePetsByTypeIntentHandler = {
    canHandle(handlerInput) {
        return isIntentRequestWithIntentName(handlerInput, 'BrowsePetsByTypeIntent');
    },
    async handle(handlerInput) {
        // Grab the type of animal the user selected
        const typeId = _.first(utils.getSlotResolutionIds(handlerInput, 'type'));
        console.log('Animal type selected:', typeId);

        // Remember the type currently being browsed
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.animalType = typeId;

        return await getAnimalsAvailableByTypeResponse(handlerInput);
    }
};

// Invoked when a user wants to hear more about a particular pet
const LearnMoreAboutPetIntentHandler = {
    canHandle(handlerInput) {
        return isIntentRequestWithIntentName(handlerInput, 'LearnMoreAboutPetIntent');
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.state = states.ADOPT_PET;

        // Get name of pet requested
        const nameId = _.first(utils.getSlotResolutionIds(handlerInput, 'name'));
        console.log("User wants to know more about:", nameId);

        const {petShopService} = handlerInput;

        return await getMoreAboutPetResponse(handlerInput, petShopService.getPet(nameId));
    }
};

// Invoked when a user says yes to learning more about a particular pet
const LearnMoreAboutPetConfirmationIntentHandler = {
    canHandle(handlerInput) {
        return isYes(handlerInput, states.LEARN_MORE);
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const pet = _.first(sessionAttributes.animalsAvailable);
        return await getMoreAboutPetResponse(handlerInput, pet);
    }
};

async function getMoreAboutPetResponse(handlerInput, pet) {
    // Handle edge case for when the requested pet is not available
    if (!pet) {
        const animalTypesAvailablePrompt = handlerInput.t('ANIMAL_TYPES_AVAILABLE_REPROMPT', {
            animalTypesAvailable: await getAvailableTypesPrompt(handlerInput)
        });
        return handlerInput.responseBuilder
            .speak(handlerInput.t('ANIMAL_TYPE_NOT_AVAILABLE', {
                prompt: animalTypesAvailablePrompt
            }))
            .reprompt(animalTypesAvailablePrompt)
            .getResponse();
    }

    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.pet = pet;
    sessionAttributes.state = states.ADOPT_PET;
    const nameId = pet.name;

    // Translate prompts
    const dataSources = {
        animalsResponse: handlerInput.t('ABOUT_PET', {
            context: nameId,
            pet: sessionAttributes.pet
        }),
        chooseAnimalPrompt: handlerInput.t('ASK_TO_ADOPT_PET', {pet: getPetTranslations(handlerInput, sessionAttributes.pet)})
    };

    return handlerInput.responseBuilder
        .addDirective(utils.getAplADirective(tokens.SINGLE_ANIMAL, audio.single_animal_presentation, dataSources))
        .reprompt(handlerInput.t('ASK_TO_ADOPT_PET', {pet: getPetTranslations(handlerInput, sessionAttributes.pet)}))
        .getResponse();
}

// Invoked when a user wants to adopt a pet
const AdoptPetIntentHandler = {
    canHandle(handlerInput) {
        return isIntentRequestWithIntentName(handlerInput, 'AdoptPetIntent');
    },
    async handle(handlerInput) {
        // Get name of pet requested
        const nameId = _.first(utils.getSlotResolutionIds(handlerInput, 'name'));
        console.log("User wants to adopt:", nameId);

        // Get metadata for pet
        const {petShopService} = handlerInput;
        const pet = await petShopService.getPet(nameId);

        // Check to make sure pet is available for adoption
        if (await petShopService.isAvailableForAdoption(nameId)) {
            return await getPetAdoptedResponse(handlerInput, pet);
        } else {
            // Handle edge case when requested pet is not available
            return handlerInput.responseBuilder
                .speak(handlerInput.t('ANIMAL_NOT_AVAILABLE'))
                .reprompt(handlerInput.t('ANIMAL_NOT_AVAILABLE_REPROMPT'))
                .getResponse();
        }

    }
};

// Invoked when a user says yes to adopting a pet
const AdoptPetConfirmationIntentHandler = {
    canHandle(handlerInput) {
        return isYes(handlerInput, states.ADOPT_PET);
    },
    async handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        return await getPetAdoptedResponse(handlerInput, sessionAttributes.pet);
    }
};

async function getPetAdoptedResponse(handlerInput, pet) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const {petShopService} = handlerInput;
    const petSentBack = await petShopService.adoptPet(pet);

    sessionAttributes.state = states.PLAY_AGAIN;

    // Add visuals if supported
    utils.addAplIfSupported(handlerInput, tokens.TITLE, visual.home, {
        isDayTime: sessionAttributes.isDayTime,
        adoptedPets: await petShopService.getAdoptedPets()
    });

    // Translate prompts
    const dataSources = {
        alexasResponse: handlerInput.t('ADOPT_PET', {pet: getPetTranslations(handlerInput, sessionAttributes.pet)}),
        petShopKeepersResponse: handlerInput.t('PET_SHOP_KEEPER_GOODBYE'),
        sentBackPrompt: await getSentBackPrompt(handlerInput, petSentBack),
        isDayTime: sessionAttributes.isDayTime,
        pet: sessionAttributes.pet,
        petAtHomeResponse: handlerInput.t('NEW_PET_AT_HOME', {pet: getPetTranslations(handlerInput, sessionAttributes.pet)}),
        playAgainPrompt: handlerInput.t('PLAY_AGAIN')
    };

    return handlerInput.responseBuilder
        .addDirective(utils.getAplADirective(tokens.TAKE_PET_HOME, audio.take_pet_home, dataSources))
        .reprompt(handlerInput.t('PLAY_AGAIN'))
        .getResponse();
}

// A prompt for when an adopted pet has to be sent back to the pet shop
// It's only returned if 1. a pet was sent back (max pets allowed reached) and 2. the user has not yet heard this message
async function getSentBackPrompt(handlerInput, petSentBack) {
    if (petSentBack) {
        const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();
        _.defaults(persistentAttributes, {
            heardSentBackPrompt: false
        });
        if (!persistentAttributes.heardSentBackPrompt) {
            const sentBackPrompt = handlerInput.t('SENT_BACK_PROMPT', {
                pet: petSentBack
            });
            persistentAttributes.heardSentBackPrompt = true; // Remember the user has heard this prompt
            await handlerInput.attributesManager.savePersistentAttributes();
            return sentBackPrompt;
        }
    }
}

// Invoked when a user does not want to adopt a pet
const DoNotAdoptPetIntentHandler = {
    canHandle(handlerInput) {
        return isNo(handlerInput, states.ADOPT_PET);
    },

    async handle(handlerInput) {
        const animalTypesAvailablePrompt = await getAvailableTypesPrompt(handlerInput);

        // Add visuals if supported
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        utils.addAplIfSupported(handlerInput, tokens.PET_SHOP, visual.pet_shop, {
            isDayTime: sessionAttributes.isDayTime
        });

        return handlerInput.responseBuilder
            .speak(handlerInput.t('DO_NOT_ADOPT_PET', {
                animalTypesAvailable: animalTypesAvailablePrompt
            }))
            .reprompt(handlerInput.t('ANIMAL_TYPES_AVAILABLE_REPROMPT', {
                animalTypesAvailable: animalTypesAvailablePrompt
            }))
            .getResponse();
    }
};

// Returns a response listing animals available of a certain type
async function getAnimalsAvailableByTypeResponse(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

    // Get available animals
    const {petShopService} = handlerInput;
    const animalsAvailable = await petShopService.getAvailablePetsByType(sessionAttributes.animalType);

    // Handle the edge case for when a user selects a type that is not available
    if (_.isEmpty(animalsAvailable)) {
        const animalTypesAvailablePrompt = handlerInput.t('ANIMAL_TYPES_AVAILABLE_REPROMPT', {
            animalTypesAvailable: await getAvailableTypesPrompt(handlerInput)
        });
        return handlerInput.responseBuilder
            .speak(handlerInput.t('ANIMAL_TYPE_NOT_AVAILABLE', {
                prompt: animalTypesAvailablePrompt
            }))
            .reprompt(animalTypesAvailablePrompt)
            .getResponse();
    }

    sessionAttributes.animalsAvailable = animalsAvailable;

    // Add visuals if supported
    utils.addAplIfSupported(handlerInput, tokens.PET_SHOP, visual.pet_catalog, {
        displayTitle: handlerInput.t("PET_CATALOG_DISPLAY_TITLE"),
        pets: animalsAvailable
    });

    // Translate prompts
    const dataSources = {
        alexasResponse: handlerInput.t('ANIMAL_TYPE_SELECTED', {context: sessionAttributes.animalType}),
        animalSounds: petShopService.getPetSoundsByType(sessionAttributes.animalType),
        shopKeeperRightThisWay: handlerInput.randomT('SHOP_KEEPER_RIGHT_THIS_WAY'),
        animalsAvailableCount: handlerInput.t('ANIMALS_AVAILABLE_COUNT', {count: animalsAvailable.length}),
        animalIntros: _.map(animalsAvailable, (pet) => {
            const speech = handlerInput.t('ANIMAL_INTRO', {pet: getPetTranslations(handlerInput, pet)});
            const sound = pet.sound;
            return {
                speech: speech,
                sound: sound
            };
        }),
        hearMorePrompt: handlerInput.t('ANIMAL_TYPE_SELECTED_PROMPT', {count: animalsAvailable.length})
    };

    sessionAttributes.state = states.LEARN_MORE;
    return handlerInput.responseBuilder
        .addDirective(utils.getAplADirective(tokens.ANIMAL_TYPE_SELECTED, audio.animal_type_selected, dataSources))
        .reprompt(handlerInput.t('ANIMAL_TYPE_SELECTED_REPROMPT'))
        .getResponse();
}

// Returns a prompt containing the types of animals available for adoption
async function getAvailableTypesPrompt(handlerInput) {
    // Get the types of animals available for adoption
    const {petShopService} = handlerInput;
    const availableTypes = await petShopService.getAvailableTypes();
    return utils.disjunction(handlerInput, _.map(availableTypes, (type) => {
        return handlerInput.t('ANIMAL_TYPE', {context: type});
    }));
}

// Invoked when a user wants to pet an animal
const GivePetsIntentHandler = {
    canHandle(handlerInput) {
        return isIntentRequestWithIntentName(handlerInput, 'GivePetsIntent')
            || isYes(handlerInput, states.GIVE_PETS);
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // Translate prompts
        const petAgainPrompt = handlerInput.t('GIVE_MORE_PETS', {
            pet: getPetTranslations(handlerInput, sessionAttributes.pet)
        });

        const dataSources = {
            petsResponse: handlerInput.randomT('THANKS_FOR_PETS', {context: sessionAttributes.pet.name}),
            pet: sessionAttributes.pet,
            petAgain: petAgainPrompt
        };

        return handlerInput.responseBuilder
            .addDirective(utils.getAplADirective(tokens.HOME, audio.post_pets, dataSources))
            .reprompt(petAgainPrompt)
            .getResponse();
    }
};

function getPetTranslations(handlerInput, pet) {
    return {
        name: handlerInput.t('PET_NAME', {context: pet.name}),
        breed: handlerInput.t('PET_BREED', {context: pet.breed})
    };
}

/**
 * Invoked when a user asks for help
 */
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return isIntentRequestWithIntentName(handlerInput, 'AMAZON.HelpIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(handlerInput.t('HELP'))
            .reprompt(handlerInput.t('HELP_REPROMPT'))
            .getResponse();
    }
};

/**
 * Invoked when a user wants to stop or cancel
 */
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return isRequestType(handlerInput, 'IntentRequest')
            && isOneOfIntentNames(handlerInput, 'AMAZON.CancelIntent', 'AMAZON.StopIntent', 'AMAZON.NoIntent');
    },
    handle(handlerInput) {
        // Give a goodbye message and end the session
        return handlerInput.responseBuilder
            .speak(handlerInput.t('EXIT'))
            .withShouldEndSession(true)
            .getResponse();
    }
};

/**
 * Invoked when the current skill session ends for any reason other than your code closing the session
 */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return isRequestType(handlerInput, 'SessionEndedRequest');
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        const {request} = handlerInput.requestEnvelope;
        const {reason} = request;

        console.log('Session ended with reason:', reason);

        if (reason === 'ERROR') {
            console.log('error:', JSON.stringify(request.error));
        }

        return handlerInput.responseBuilder.getResponse();
    }
};

/**
 * Provides a graceful fallback message when no other handler can handle an IntentRequest
 * This should be the last request handler configured in skill builder below
 */
const FallbackHandler = {
    canHandle(handlerInput) {
        return isRequestType(handlerInput, 'IntentRequest');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(handlerInput.t('FALLBACK'))
            .reprompt(handlerInput.t('FALLBACK_REPROMPT'))
            .getResponse();
    }
};

/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);

        return handlerInput.responseBuilder
            .speak(handlerInput.t('ERROR'))
            .withShouldEndSession(true)
            .getResponse();
    }
};

/**
 * This request interceptor will bind two translations function to handlerInput:
 * 't' which returns the translated value
 * 'randomT' which will return a random element if the translated value is an array
 */
const LocalizationInterceptor = {
    process(handlerInput) {
        i18next.init({
            lng: Alexa.getLocale(handlerInput.requestEnvelope),
            resources: languageStrings,
            returnObjects: true
        }).then((t) => {
            handlerInput.t = (...args) => {
                return t(...args);
            };
            handlerInput.randomT = (...args) => {
                const value = t(...args);
                if (_.isArray(value)) {
                    // if the translated value is an array, return a random element
                    return _.sample(value);
                } else {
                    return value;
                }
            };
        });
    }
};

// Creates a new instance of the PetShopService on each request
const PetShopServiceInterceptor = {
    process(handlerInput) {
        handlerInput.petShopService = new PetShopService(handlerInput);
    }
};

/**
 * The SkillBuilder acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom.
 */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        VisitPetStoreIntentHandler,
        BrowsePetsByTypeIntentHandler,
        DoNotAdoptPetIntentHandler,
        LearnMoreAboutPetIntentHandler,
        LearnMoreAboutPetConfirmationIntentHandler,
        AdoptPetIntentHandler,
        AdoptPetConfirmationIntentHandler,
        GivePetsIntentHandler,
        DoNotPetAnimalIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        FallbackHandler // make sure FallbackHandler is last so it doesn't override your other IntentRequest handlers
    )
    .addRequestInterceptors(
        {
            process(handlerInput) {
                console.log('Request:', JSON.stringify(handlerInput, null, 2));
            }
        },
        LocalizationInterceptor,
        PetShopServiceInterceptor
    )
    .addResponseInterceptors(
        {
            process(handlerInput, response) {
                console.log('Response:', JSON.stringify(response, null, 2));
            }
        }
    )
    .addErrorHandlers(
        ErrorHandler
    )
    .withPersistenceAdapter(
        new persistenceAdapter.S3PersistenceAdapter({bucketName: process.env.S3_PERSISTENCE_BUCKET})
    )
    .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('reference-skills/pet-tales/v1')
    .lambda();