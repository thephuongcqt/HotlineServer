var db = require("../DataAccess/DBUtils");
var Moment = require("moment");
var fs = require('fs');
var logger = require("./Logger");

var utils = {
    responseFailure: function (error) {
        var response = {
            "status": false,
            "value": null,
            "error": error
        };
        return response;
    },

    responseSuccess: function (value) {
        var response = {
            "status": true,
            "value": value,
            "error": null
        };
        return response;
    },

    checkNumberInArray: function (phoneNumber, array) {
        for (var i in array) {
            if (phoneNumber.trim() === array[i].trim()) {
                return true;
            }
        }
        return false;
    },

    getFakePhoneNumber: function (bookedNumbers, randomNumbers) {
        for (var i in randomNumbers) {
            if (!this.checkNumberInArray(randomNumbers[i], bookedNumbers))
                return randomNumbers[i].trim();
        }
        return null;
    },

    getDateForUI: function (date) {
        if (date) {
            return Moment(date).format("DD-MM-YYYY");
        }
        return null;
    },

    getDateForVoice: function (date) {
        if (date) {
            var mDate = Moment(date);
            var message = mDate.format("D") + " tháng " + mDate.format("M") + " năm " + mDate.format("YYYY");
            return message;
        }
        return null;
    },

    getTimeForVoice: function(date){
        if (date) {
            var mDate = Moment(date);
            var message = mDate.format("H") + " giờ " + mDate.format("m") + " phút";
            return message;
        }
        return null;
    },

    parseDate: function (date) {
        if (date) {
            return Moment(date).format("YYYY-MM-DDTHH:mm:ss.000Z");
        }
        return null;
    },

    parseDateOnly: function (date) {
        if (date) {
            return Moment(date).format("YYYY-MM-DD");
        }
        return null;
    },

    parseTime: function (time) {
        if (time) {
            return Moment(time, "h:mm:ss A").format("HH:mm:ss");
        }
        return null;
    },

    getMomentTime: function (time) {
        if (time) {
            return Moment(time, "HH:mm:ss");
        }
        return null;
    },

    toBeautifulName: function (name) {
        if (name) {
            var splitStr = name.toLowerCase().split(' ');
            for (var i = 0; i < splitStr.length; i++) {
                splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
            }
            return splitStr.join(' ').replace(/\s\s+/g, ' ').trim();;
        }
        return name;
    },

    checkValidateMessage: function (message) {
        var patternMatchingWords = "[0-9~!@#$%^&*_+:<>?,.]{1,}";
        if (RegExp(patternMatchingWords).test(message)) {
            return false;
        }
        patternMatchingWords = "[\[\]]"
        if (RegExp(patternMatchingWords).test(message)) {
            return false;
        }

        var firstLetter = "[A-EGHIK-VXYÂĐỔÔÚỨ]".normalize("NFC"),
            otherLetters = "[a-eghik-vxyàáâãèéêìíòóôõùúýỳỹỷỵựửữừứưụủũợởỡờớơộổỗồốọỏịỉĩệểễềếẹẻẽặẳẵằắăậẩẫầấạảđ₫]".normalize("NFC"),
            regexString = "^Dh "
                // + firstLetter + otherLetters + "+\\s"
                + "(" + firstLetter + otherLetters + "+\\s)*";
        // + firstLetter + otherLetters + "+$";
        var regexPattern = RegExp(regexString);
        return regexPattern.test(message);
    },

    getClinicName: function (clinicName) {
        if (clinicName) {
            clinicName.trim();
            if(clinicName.length <= 11){
                return clinicName;
            }
            var newText = clinicName.toUpperCase();
            var regexs = ["^PHÒNG KHÁM", "^PHONG KHAM", "^PHÒNG KHAM", "^PHONG KHÁM"];
            var isMatch = false;
            for (var index in regexs) {
                var regexString = regexs[index];
                var regexPattern = RegExp(regexString);
                if (regexPattern.test(newText)) {
                    isMatch = true;
                    break;
                }
            }
            if (isMatch) {
                clinicName = clinicName.slice(11);
            }
        }
        return clinicName;
    },

    getFullName: function (name) {
        return name.replace(new RegExp("^Dh "), "");
    },

    generatePasswordToken: function () {
        var min = 1000, max = 9999;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    miliseconds: function (hours, minutes, seconds) {
        return ((hours * 60 * 60 + minutes * 60 + seconds) * 1000);
    },

    getMiliseconds: function (mTime) {
        var times = this.miliseconds(mTime.hour(), mTime.minute(), mTime.second());
        return times;
    },

    expiredDate: function () {
        var expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() + 1);
        return expiredDate;
    },

    getStartDay: function (date) {

        if (date) {
        } else {
            date = new Date();
        }
        date.setHours(0, 0, 0, 0);
        return date;
    },

    getEndDay: function (date) {
        if (date) {
        } else {
            date = new Date();
        }
        date.setHours(23, 59, 59, 999);
        return date;
    },

    writeFile: async (filePath, content) => {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, content, function(err) {
                if(err) {
                    reject(err);
                } else{
                    resolve("The file was saved!");
                }                            
            });
        })        
    },

    getOnlyNumber: (phoneNumber) => {
        var num = phoneNumber.replace(/[^0-9]/g,'');
        return num;
    }
}
module.exports = utils;