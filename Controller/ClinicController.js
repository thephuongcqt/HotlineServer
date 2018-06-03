var db = require("../Utils/DBUtils");
var utils = require("../Utils/Utils");
var Const = require("../Utils/Const");

module.exports = function (app, express) {
    apiRouter = express.Router();

    apiRouter.post("/changeInformation", function (req, res) {
        var username = req.body.username;
        var password = req.body.password;
        var address = req.body.address;
        var clinicName = req.body.clinicName;
        db.User.where({ "username": username, "password": password })
            .fetch()
            .then(function (collection) {
                if (collection == null) {
                    var responseObj = utils.makeResponse(false, false, "Incorrect username or password");
                    res.json(responseObj);
                } else {
                    db.Clinic.where({ "username": username })
                        .save({ "address": address, "clinicName": clinicName }, { patch: true })
                        .then(function (model) {
                            res.json(utils.makeResponse(true, null, null));
                        })
                        .catch(function (err) {
                            var responseObj = utils.makeResponse(false, false, err);
                            res.json(responseObj);
                        });
                }
            })
            .catch(function (err) {
                var responseObj = utils.makeResponse(false, false, "Incorrect username or password");
                res.json(responseObj);
            });
    });


    apiRouter.get("/getAllClinic", function (req, res) {
        db.User.forge()
            .where("role", Const.ROLE_CLINIC)
            .fetchAll()
            .then(function (collection) {
                var userList = collection.toJSON();
                var usernames = [];
                for(var i in userList){
                    usernames.push(userList[i].username);
                }                
                db.Clinic.forge( )
                    .where("username", "in", usernames)
                    .fetchAll()
                    .then(function (result) {
                        var clinics = result.toJSON();
                        var clinicList = []
                        for(var i in clinics){
                            var clinic = clinics[i];
                            for(var j in userList){
                                var user = userList[j];
                                if(clinic.username == user.username){
                                    user.address = clinic.address;
                                    user.clinicName = clinic.clinicName;
                                    user.password = "";
                                    clinicList.push(user);
                                }
                            }
                        }
                        var responseObj = utils.makeResponse(true, clinicList, null);
                        res.json(responseObj)
                    })
                    .catch(function (err) {
                        var responseObj = utils.makeResponse(false, null, err.message);
                        res.json(responseObj);
                    })

            })
            .catch(function (err) {
                var responseObj = utils.makeResponse(false, null, err.message);
                res.json(responseObj);
            });
    })
    return apiRouter;
}