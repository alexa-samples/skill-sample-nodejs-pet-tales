const Alexa = require('ask-sdk');
const _ = require('lodash');

function isRequestType(handlerInput, requestType) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === requestType;
}

function isIntentName(handlerInput, intentName) {
    return Alexa.getIntentName(handlerInput.requestEnvelope) === intentName;
}

function isOneOfIntentNames(handlerInput, ...intentNames) {
    return intentNames.includes(Alexa.getIntentName(handlerInput.requestEnvelope));
}

function isIntentRequestWithIntentName(handlerInput, intentName) {
    return isRequestType(handlerInput, 'IntentRequest')
        && isIntentName(handlerInput, intentName);
}

function isSessionState(handlerInput, state) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    return sessionAttributes.state === state;
}

function isYes(handlerInput, state) {
    return isRequestType(handlerInput, 'IntentRequest')
        && isIntentName(handlerInput, 'AMAZON.YesIntent')
        && isSessionState(handlerInput, state);
}

function isNo(handlerInput, state) {
    return isRequestType(handlerInput, 'IntentRequest')
        && isIntentName(handlerInput, 'AMAZON.NoIntent')
        && isSessionState(handlerInput, state);
}

function getPerson(handlerInput) {
    return handlerInput.requestEnvelope.context.System.person;
}

function getPersonId(handlerInput) {
    const person = getPerson(handlerInput);
    if (person) {
        return person.personId;
    }
}

function getSlotResolutionValues(handlerInput, slotName) {
    const slot = Alexa.getSlot(handlerInput.requestEnvelope, slotName);
    const authorities = _.get(slot, 'resolutions.resolutionsPerAuthority', []);
    return _.flatten(_.map(authorities, (authority) => {
        return authority.values;
    }));
}

function getSlotResolutionIds(handlerInput, slotName) {
    const values = getSlotResolutionValues(handlerInput, slotName);
    return _.map(values, (value) => {
        return value.value.id;
    });
}

async function getTimeZone(handlerInput) {
    const {serviceClientFactory, requestEnvelope} = handlerInput;
    const {deviceId} = requestEnvelope.context.System.device;
    const client = serviceClientFactory.getUpsServiceClient();
    return await client.getSystemTimeZone(deviceId)
}

function isAplSupported(handlerInput) {
    const interfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
    const aplInterface = interfaces["Alexa.Presentation.APL"];
    return _.get(aplInterface, 'runtime.maxVersion') >= "1.1";
}

function addAplIfSupported(handlerInput, token, document, data = {}) {
    if (isAplSupported(handlerInput)) {
        handlerInput.responseBuilder
            .addDirective({
                "type": "Alexa.Presentation.APL.RenderDocument",
                "token": token,
                "document": document,
                "datasources": {
                    "data": {
                        "type": "object",
                        "properties": data
                    }
                }
            });
    }
}

function getAplADirective(token, document, data = {}) {
    return {
        "type": "Alexa.Presentation.APLA.RenderDocument",
        "token": token,
        "document": document,
        "datasources": {
            "data": {
                "type": "object",
                "properties": data
            }
        }
    }
}

/**
 * Formats an array of strings for speech
 *
 * Example input: ["milk", "cookies"]
 * Example output: "milk, or, cookies"
 *
 * Note: this logic may not work for all locales
 */
function disjunction(handlerInput, array) {
    if (array.length === 1) {
        return array[0];
    }
    return array.slice(0, -1).concat(handlerInput.t("DISJUNCTION")).concat(array[array.length - 1]).join(", ");
}

module.exports = {
    isRequestType,
    isIntentName,
    isOneOfIntentNames,
    isIntentRequestWithIntentName,
    isSessionState,
    isYes,
    isNo,
    getPerson,
    getPersonId,
    getSlotResolutionValues,
    getSlotResolutionIds,
    getTimeZone,
    isAplSupported,
    addAplIfSupported,
    getAplADirective,
    disjunction
};