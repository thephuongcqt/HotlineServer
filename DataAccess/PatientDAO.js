var db = require("./DBUtils");
var logger = require("../Utils/Logger");
var dao = require("./BaseDAO");
var appointmentDao = require("./AppointmentDAO");

var patientDao = {
    insertNotExistedPatient: function(patient){        
        return new Promise(async (resolve, reject) => {
            try {
                var receivedPatient = await this.checkExistedPatient(patient);
                if(receivedPatient){
                    resolve(receivedPatient);                    
                } else{
                    var model = await dao.create(db.Patient, patient);
                    patient.patientID = model.id;
                    patient.address = null;
                    resolve(patient);
                }
            } catch (error) {
                reject(error);
            }            
        });
    },

    checkExistedPatient: function (patient) {
        var json = { "phoneNumber": patient.phoneNumber, "fullName": patient.fullName, "clinicUsername": patient.clinicUsername};
        return new Promise((resolve, reject) => {
            dao.findByProperties(db.Patient, json)
                .then(collection => {
                    if (collection.length > 0) {
                        for(var index in collection){
                            var tmp = collection[index];
                            if (tmp.fullName.toUpperCase() == patient.fullName.toUpperCase()){
                                resolve(tmp);
                                return;
                            }
                        }
                        resolve(null);
                    }
                    resolve(null);
                })
                .catch(err => {
                    logger.log(err);
                    reject(err);
                });
        });
    },

    checkPatientBooked: function (clinicUsername, phoneNumber, fullName) {        
        return new Promise((resolve, reject) => {
            this.checkExistedPatient(phoneNumber, fullName)
                .then(patient => {
                    if (patient) {                        
                        var json = { "clinicUsername": clinicUsername, "patientID": patient.patientID };
                        appointmentDao.getAppointmentsInCurrentDayWithProperties(json)
                        .then(model => {
                            if(model.length > 0){
                                resolve(true);
                            } else{
                                resolve(false);
                            }
                        })
                        .catch(err => {
                            reject(err);
                            logger.log(err);
                        })
                    } else{
                        resolve(false);
                    }
                })
                .catch(err => {
                    reject(err);
                    logger.log(err);
                });
        });
    },
    getPatientInfo: function (patientID) {
        return new Promise((resolve, reject) => {
            dao.findByID(db.Patient, "patientID", patientID)
                .then(collection => {
                    resolve(collection);
                })
                .catch(err => {
                    logger.log(err);
                    reject("Patient is not exist");
                });
        });
    },
    getAllPatient: function () {
        return new Promise((resolve, reject) => {
            dao.findAll(db.Patient)
                .then(collection => {
                    resolve(collection);
                })
                .catch(err => {
                    logger.log(err);
                    reject("Patient is not exist");
                });
        });
    },
    updatePatient: function (patientID, phoneNumber, fullName, address, yob, gender) {
        var json = { "patientID": patientID, "phoneNumber": phoneNumber, "fullName": fullName, "address": address, "yob": yob, "gender": gender };
        return new Promise((resolve, reject) => {
            dao.update(db.Patient, json, "patientID")
                .then(collection => {
                    resolve(collection);
                })
                .catch(err => {
                    logger.log(err);
                    reject("Update patient fail");
                });
        });
    }
};

module.exports = patientDao; 