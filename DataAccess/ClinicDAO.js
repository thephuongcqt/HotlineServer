var db = require("./DBUtils");
var logger = require("../Utils/Logger");
var utils = require("../Utils/Utils");
var Const = require("../Utils/Const");
var dao = require("./BaseDAO");
var configUtils = require("../Utils/ConfigUtils");
var hash = require("../Utils/Bcrypt");
var blockDAO = require("../DataAccess/BlockDAO");

var clinicDao = {    
    getTwilioAccountByID: async function (accountSid) {
        try {
            var json = { accountSid: accountSid };
            var clinics = await dao.findByProperties(db.Clinic, json);
            if (clinics && clinics.length > 0) {
                var clinic = clinics[0];
                if (clinic) {
                    var accountSid = clinic.accountSid;
                    var authToken = clinic.authToken;
                    if (accountSid && authToken) {
                        return configUtils.getTwilioAccount(accountSid, authToken);
                    }
                }
            }
            throw new Error("Cannot find Clinic by accountSid");
        } catch (error) {
            logger.log(error);
        }
        return configUtils.getDefaultTwilio();
    },

    getTwilioAccountByPhoneNumber: async function (phoneNumber) {
        try {
            var json = { phoneNumber: phoneNumber };
            var users = await dao.findByPropertiesWithRelated(db.User, json, "clinic");
            if (users && users.length > 0) {
                var user = users[0];
                if (user && user.clinic) {
                    var clinic = user.clinic;
                    if (clinic) {
                        var accountSid = clinic.accountSid;
                        var authToken = clinic.authToken;
                        if (accountSid && authToken) {
                            return configUtils.getTwilioAccount(accountSid, authToken);
                        }
                    }
                }
            }
            throw new Error("Cannot find clinic by phone number");
        } catch (error) {
            logger.log(error);
        }
        return configUtils.getDefaultTwilio();
    },

    getClinicsWaitingForPhoneNumber: async function () {
        var json = { role: Const.ROLE_CLINIC, isActive: Const.ACTIVATION };
        var result = await db.User.where(json)
            .query(user => {
                user.where('phoneNumber', null);
            })
            .fetchAll({ withRelated: ["clinic"] });
        return result.toJSON();
    },

    findClinicByPhone: async function (phoneNumber) {
        var result = null;
        try {
            var collection = await dao.findByPropertiesWithRelated(db.User, { "phoneNumber": phoneNumber }, "clinic")
            if (collection != null && collection.length > 0) {
                result = collection[0];
            }
        } catch (error) {
            logger.log(error);
        }
        return result;
    },

    getAllClinic: function () {
        return new Promise((resolve, reject) => {
            var json = { "role": Const.ROLE_CLINIC, "isActive": Const.ACTIVATION };
            dao.findByPropertiesWithRelated(db.User, json, "clinic")
                .then(collection => {
                    resolve(collection);
                })
                .catch(err => {
                    logger.log(err);
                    reject("Không tồn tại tài khoản nào");
                });
        });
    },
    getAllUser: function () {
        return new Promise((resolve, reject) => {
            dao.findAllWithRelated(db.User, "clinic")
                .then(collection => {
                    resolve(collection);
                })
                .catch(err => {
                    logger.log(err);
                    reject("Không tồn tại tài khoản nào");
                });
        });
    },

    getClinicInfo: async function (username) {
        var results = null;
        try {
            var collection = await dao.findByIDWithRelated(db.User, "username", username, "clinic");
            if (collection != null) {
                results = collection;
                var collection = await dao.findByIDWithRelated(db.Clinic, "username", username, "workingHours");
                if (collection != null) {
                    results.workingHours = collection.workingHours;
                }
            }
        } catch (error) {
            logger.log(error);
        }
        return results;
    },
    getGreetingURL: async function (phoneNumber) {
        try {
            if (!phoneNumber) {
                throw new Error("Undefined phone number");
            }
            var json = { "phoneNumber": phoneNumber };
            var clinics = await dao.findByPropertiesWithRelated(db.User, json, "clinic");
            if (!clinics || clinics.length == 0) {
                throw new Error("Cannot find clinic by phone number");
            }
            var clinic = clinics[0].clinic;
            if (clinic && clinic.greetingURL) {
                return clinic.greetingURL;
            } else {
                throw new Error("Fail to get greeting URL");
            }
        } catch (error) {
            logger.log(error);
            return configUtils.getDefaultGreetingURL();
        }
    },
    getBlockNumber: async function (callFrom, phoneNumber) {
        try {
            if (!phoneNumber) {
                throw new Error("Undefined phone number");
            }
            phoneNumber = "+" + phoneNumber.trim();
            callFrom = "+" + callFrom.trim();
            var json = { "phoneNumber": phoneNumber };
            var clinics = await dao.findByProperties(db.User, json);
            if (!clinics || clinics.length == 0) {
                throw new Error("Cannot find clinic by phone number");
            }
            var clinic = clinics[0].username;
            var arrayBlockNumber = await blockDAO.arrayAllBlock(clinic);
            var checkBlockNumber = utils.checkNumberInArray(callFrom, arrayBlockNumber);
            if (checkBlockNumber == true) {
                return callFrom;
            } else {
                return null;
            }
        } catch (error) {
            logger.log(error);
            return configUtils.getDefaultGreetingURL();
        }
    },
    checkExistedClinic: async function (username, email, phoneNumber) {
        if (!(username && username.trim())) {
            throw new Error("Tên đăng nhập không được để trống");
        }
        if (!(email && email.trim())) {
            throw new Error("Email không được để trống");
        }
        if (!(phoneNumber && phoneNumber.trim())) {
            throw new Error("Số điện thoại không được để trống");
        }
        try {
            var json = { "username": username, "email": email, "phoneNumber": phoneNumber };
            var promises = [dao.findByProperties(db.User, { "username": username }), dao.findByProperties(db.User, { "email": email }), dao.findByProperties(db.User, { "phoneNumber": phoneNumber })];
            var results = await Promise.all(promises);
            if (results && results.length > 1) {
                if (results[0].length > 0 || results[1].length > 0) {
                    return true;
                } else {
                    return false;
                }
            }
            return true;
        } catch (error) {
            logger.log(error);
            throw new Error(Const.Error.ClinicRegisterAnErrorOccured);
        }
        return true;
    },

    insertClinic: async function (username, password, clinicName, address, email, phoneNumber) {
        try {
            var hashedPassword = await hash.hashPassword(password);
            var userJson = {
                "username": username,
                "phoneNumber": phoneNumber,
                "password": hashedPassword,
                "email": email,
                "role": Const.ROLE_CLINIC,
                "isActive": Const.DEACTIVATION
            };
            var clinicJson = {
                "username": username,
                "address": address,
                "clinicName": clinicName,
                "examinationDuration": undefined,
                "delayDuration": undefined
            };
            var promises = [dao.create(db.User, userJson), dao.create(db.Clinic, clinicJson)];
            var dayOfWeek = [0, 1, 2, 3, 4, 5, 6];
            for (var i in dayOfWeek) {
                var day = dayOfWeek[i];
                var json = {
                    "clinicUsername": username,
                    "startWorking": undefined,
                    "endWorking": undefined,
                    "applyDate": day,
                    "isDayOff": Const.DAYOFF
                };
                promises.push(dao.create(db.WorkingHours, json));
            }
            await Promise.all(promises);
        } catch (error) {
            logger.log(error);
            throw new Error(Const.Error.ClinicRegisterAnErrorOccured);
        }
    },

    removeTwilioByPhoneNumber: async function (phoneNumber) {
        try {
            var users = await dao.findByProperties(db.User, { "phoneNumber": phoneNumber });
            var promises = [];
            if (users && users.length > 0) {
                for (var i in users) {
                    var user = users[i];
                    promises.push(this.removeTwilio(user.username));
                }
            }
            if (promises.length > 0) {
                await Promise.all(promises);
            }
        } catch (error) {
            logger.log(error);
        }
    },

    removeTwilio: async function (username) {
        var user = await dao.findByIDWithRelated(db.User, "username", username, "clinic");
        if (user) {
            var userJson = {
                "username": username,
                "phoneNumber": null
            };
            var clinicJson = {
                "username": username,
                "accountSid": null,
                "authToken": null
            };
            var promises = [dao.update(db.User, userJson, "username"), dao.update(db.Clinic, clinicJson, "username")];
            await Promise.all(promises);
        }
    },

    registerClinic: async function (username, password, email, fullName, address, clinicName, applyDateList) {
        var results = null;
        var userJson = { "username": username, "password": password, "fullName": fullName, "role": Const.ROLE_CLINIC, "isActive": Const.ACTIVATION, "email": email };
        var clinicJson = { "username": username, "address": address, "clinicName": clinicName, "examinationDuration": "0:30:00", "imageURL": null, "greetingURL": null };
        try {
            var addUser = await dao.create(db.User, userJson);
            var addClinic = await dao.create(db.Clinic, clinicJson);
            var workHoursList = [];
            for (var i in applyDateList) {
                var applyDate = applyDateList[i];
                var workHoursJson = { "clinicUsername": username, "startWorking": "6:30:00", "endWorking": "17:00:00", "applyDate": applyDate, "isDayOff": 0 };
                var addWorkHours = await dao.create(db.WorkingHours, workHoursJson);
                workHoursList.push(addWorkHours);
            }
            results = Object.assign(addUser, addClinic);
        } catch (error) {
            logger.log(error);
        }
        return results;
    },

    getClinicResponse: async function (username) {
        var results = await dao.findByPropertiesWithManyRelated(db.Clinic, { "username": username }, ["user", "workingHours"]);
        if (results && results.length > 0) {
            var clinic = results[0];
            clinic.address = clinic.address;
            clinic.clinicName = clinic.clinicName;
            clinic.examinationDuration = clinic.examinationDuration;
            clinic.delayDuration = clinic.delayDuration;
            clinic.expiredLicense = utils.parseDate(clinic.expiredLicense);
            clinic.currentTime = utils.parseDate(new Date());
            clinic.imageURL = clinic.imageURL;
            clinic.greetingURL = clinic.greetingURL;
            clinic.phoneNumber = clinic.user.phoneNumber;
            clinic.role = clinic.user.role;
            clinic.isActive = clinic.user.isActive;
            clinic.email = clinic.user.email;
            clinic.username = clinic.user.username;
            delete clinic.user;
            var workingHourList = [];
            var emptyWorking = false;
            for (var i in clinic.workingHours) {
                var workingHour = clinic.workingHours[i];
                delete workingHour.id;
                delete workingHour.clinicUsername;
                workingHourList.push(workingHour);
                if (!(workingHour.startWorking && workingHour.endWorking)) {
                    emptyWorking = true;
                    break;
                }
            }
            workingHourList.sort(function (a, b) {
                return a.applyDate - b.applyDate;
            });
            clinic.workingHours = emptyWorking ? null : workingHourList;
            return clinic
        } else {
            throw new Error("Đã xảy ra lỗi khi lấy thông tin phòng khám");
        }
    }
}
module.exports = clinicDao;