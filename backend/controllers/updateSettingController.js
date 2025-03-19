const updateSettingService = require('../services/userSettingService');

const getSettingController = async (req, res) => {
    try {
        const userId = req.params.userId;


        if (req.user.id !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const settings = await updateSettingService.getSettings(userId);

        return res.status(200).json({
            success: true,
            message: 'Settings found',
            data: settings
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}
const updateSettingController = async (req, res) => {
    try {
        const userId = req.params.userId;
        const settings = req.body;
        console.log('userId', userId);
        console.log('settings', settings);

        if (req.user.id.toString() !== userId.toString() && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const updateSetting = await updateSettingService.updateSettings(userId, settings);

        return res.status(200).json({
            success: true,
            message: 'Settings updated',
            data: updateSetting
        });
    } catch (error) {
        console.error(error);
    }
}

module.exports = {
    getSettingController,
    updateSettingController
}