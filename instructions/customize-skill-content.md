# Build An Alexa APL & APL for Audio Skill
<img src="https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/header._TTH_.png" />

## Customize the Skill to be Yours

At this point, you should have a working copy of our Pet Tales skill.  In order to make it your own, you will need to customize it with data and responses that you create.  Here are the things you will need to change:

1.  **Customize voice prompts.** There are several prompts and responses you may want to customize. To do that:

        1. Navigate to the **Code** tab again, and expand the project folder on the left to `Skill Code/lambda`.
    
        2. Open **[en.js](../lambda/custom/resources/en.js)**
    
        3. Modify existing prompts or add more for variation. This example changes what one of the pets, Rascal, will say when introduced:
    
        Before:
        ```js
            module.exports = {
                translation: {
                    ...,
                    ...,
                    ...,
                    ABOUT_PET_RASCAL: [
                            getPetVoice('RASCAL', 'Hi Hi Hi. Hello. How are you? I\'m Rascal.'),
                            getPetAudio('RASCAL'),
                            getPetVoice('RASCAL', 'I just love love love to run and jump and play. Please please please let me be your pet!'),
                            getPetAudio('RASCAL')
                        ],
                    ...,
                    ...,
                    ...,
                },
            };
        ```
    
        After:
        ```js
            module.exports = {
                translation: {
                    ...,
                    ...,
                    ...,
                    ABOUT_PET_RASCAL: [
                            getPetAudio('RASCAL'),
                            getPetAudio('RASCAL'),
                            getPetVoice('RASCAL', 'Hi Hi Hi. Nice to meet you! I\'m Rascal.'),
                            getPetAudio('RASCAL'),
                            getPetVoice('RASCAL', 'Barking is my favorite! Please please please let me be your pet!'),
                            getPetAudio('RASCAL'),
                            getPetAudio('RASCAL'),
                            getPetAudio('RASCAL')
                        ],
                    ...,
                    ...,
                    ...,
                },
            };
        ```
        
2. **Add new pets.** You may want to add new pets your users can adopt. To do that:
    
     1. Add an entry for your new pet in the `pets` array in **[petShopService.js](../lambda/custom/petShopService.js)**
     2. Add a new slot value in the `Name` custom slot for your pet's name and any synonyms in each of your **[interaction models](../models)**
     3. Add prompts for your new pet in each set of language strings. There are three sets of prompts to add. Follow the example for Rascal:
     - `ABOUT_PET_RASCAL`
     - `THANKS_FOR_PETS_RASCAL`
     - `PET_NAME_RASCAL` 

3.  **New language.** If you are creating this skill for another language other than English, you will need to make sure Alexa's responses are also in that language.

    - For example, if you are creating your skill in German, every single response that Alexa makes has to be in German. You can't use English responses or your skill will fail certification.
    
    To add a new language:
    
    1. Make a copy of **[en.js](../lambda/custom/resources/en.js)** and give it the name of the new locale you're adding. Example: `de-DE.js` for German.
    2. Replace all the English prompts in your new file with translations in the new language.
    3. Add an entry for your new locale in **[languageStrings.js](../lambda/custom/resources/languageStrings.js)**
    4. Make a copy of the **[en-US.js](../models/en-US.json)** interaction model. Example: `de-DE.json`
    5. Replace the invocation name, intent samples, and slot values and synonyms in the new interaction model with translations in the new language.
    6. Add the new locale to the **[skill manifest](../skill.json)**

4. After you're done editing all of the files necessary, as before, make sure to press **Save**, **Deploy**, and navigate back to the **Testing** tab to test your changes.
4. **Once you have customized the skill's data, languages and/or sentences, return to the [Amazon Developer Portal](https://developer.amazon.com/alexa/console/ask?&sc_category=Owned&sc_channel=RD&sc_campaign=Evangelism2018&sc_publisher=github&sc_content=Survey&sc_detail=fact-nodejs-V2_GUI-5&sc_funnel=Convert&sc_country=WW&sc_medium=Owned_RD_Evangelism2018_github_Survey_fact-nodejs-V2_GUI-5_Convert_WW_beginnersdevs&sc_segment=beginnersdevs) and select your skill from the list.**

5.  **Click on "Distribution" in the top navigation to move on to the publishing and certification of your skill.**


[![Next](https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/general/buttons/button_next_publication._TTH_.png)](./submit-for-certification.md)
