var db = require("./DBUtils");
var logger = require("../Utils/Logger");
var dao = require("./BaseDAO");
var appointmentDao = require("./AppointmentDAO");

var patientDao = {
    searchPatient: async function (searchValue, username) {
        return new Promise(async (resolve, reject) => {
            var sql = "SELECT DISTINCT *"
                + " FROM tbl_patient"
                + " WHERE (UPPER(fullName) LIKE UPPER('%" + searchValue + "%')"
                + " OR UPPER(phoneNumber) LIKE UPPER('%" + searchValue + "%'))"
                + " AND (clinicUsername LIKE '" + username + "')"
                + " LIMIT 30";
            db.knex.raw(sql)
                .then(result => {
                    if (result && result.length > 0) {
                        var json = JSON.parse(JSON.stringify(result[0]));
                        resolve(json);
                    }
                    resolve([]);
                })
                .catch(error => {
                    reject(error);
                });
        })
    },


    insertNotExistedPatient: function (patient) {
        return new Promise(async (resolve, reject) => {
            try {
                var receivedPatient = await this.checkExistedPatient(patient);
                if (receivedPatient) {
                    resolve(receivedPatient);
                } else {
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
        var json = { "phoneNumber": patient.phoneNumber, "fullName": patient.fullName, "clinicUsername": patient.clinicUsername };
        return new Promise((resolve, reject) => {
            dao.findByProperties(db.Patient, json)
                .then(collection => {
                    if (collection.length > 0) {
                        for (var index in collection) {
                            var tmp = collection[index];
                            if (tmp.fullName.toUpperCase() == patient.fullName.toUpperCase()) {
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
            var json = { "phoneNumber": phoneNumber, "fullName": fullName, "clinicUsername": clinicUsername };
            this.checkExistedPatient(json)
                .then(patient => {
                    if (patient) {
                        var json = { "clinicUsername": clinicUsername, "patientID": patient.patientID };
                        appointmentDao.getAppointmentsInCurrentDayWithProperties(json)
                            .then(model => {
                                if (model.length > 0) {
                                    resolve(true);
                                } else {
                                    resolve(false);
                                }
                            })
                            .catch(err => {
                                reject(err);
                                logger.log(err);
                            })
                    } else {
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