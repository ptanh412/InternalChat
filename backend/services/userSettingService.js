const Users = require('../models/Users');
const UserSettings = require('../models/UserSetting');

const getSettings = async (userId) => {
    try{
        const user = await Users.findOne({_id: userId});
        if (!user){
            throw new Error('User not found');
        }

        const settings = await UserSettings.findOne({
            userId: userId
        });

        return settings;
    }catch (error){
        console.error(error);
        throw new Error('Error getting settings');  
    }
}
const updateSettings = async (userId, settings) => {
    try{
        const user = await Users.findOne({
            _id: userId
        });
        if (!user){
            throw new Error('User not found');
        }

        if (!settings){
            throw new Error('Settings not found');
        }

        const validSettings = {};

        if (settings.theme && ['light', 'dark'].includes(settings.theme)){
            validSettings.theme = settings.theme;
        }
        if (settings.language && ['english', 'vietnamese'].includes(settings.language)){
            validSettings.language = settings.language;
        }

        validSettings.updatedAt = Date.now();

        const updateSetting = await UserSettings.findOneAndUpdate(
            {userId: userId},
            {$set: validSettings},
            {new: true}
        );

        return updateSetting;
    }catch (error){
        console.error(error);
    }
}

module.exports = {
    getSettings,
    updateSettings
}