var braintree = require("braintree");
var db = require("../DataAccess/DBUtils");
var utils = require("../Utils/Utils");
var Const = require("../Utils/Const");
var baseDao = require("../DataAccess/BaseDAO");
var logger = require("../Utils/Logger");
var clinicDao = require("../DataAccess/ClinicDAO");

// var gateway = braintree.connect({
//     environment: braintree.Environment.Sandbox,
//     merchantId: 'pfg7tm6zrnm22cjc',
//     publicKey: '8cgbnsy595fqw6h9',
//     privateKey: '86b2b56d9f3265af87082e42ec5821e1'
// });

var gateway = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: '82gyv2vz8v8jx5mf',
    publicKey: '624r7xwxgwsfg65m',
    privateKey: '4bfada29f82da95728352d08183d70d9'
});

module.exports = function (app, express) {
    var apiRouter = express.Router();

    apiRouter.get("/getToken", function (req, res) {
        gateway.clientToken.generate({}, function (err, response) {
            if (typeof response !== 'undefined') {
                res.json(utils.responseSuccess(response));
            } else {
                res.json(utils.responseFailure(err.message));
                console.log(err);
            }
        });
    });

    apiRouter.post("/checkout", async function (req, res) {
        var username = req.body.username;
        var licenseID = req.body.licenseID;
        var nonce = req.body.nonce;
        try {
            // nonce = JSON.parse(nonce);
            var license = await baseDao.findByID(db.License, "licenseID", licenseID);
            gateway.transaction.sale({
                amount: license.price,
                paymentMethodNonce: nonce,
                options: {
                    submitForSettlement: true
                }
            }, async function (err, result) {
                if (result && result.success) {
                    await handleBuyLicense(username, licenseID);
                    var clinic = await clinicDao.getClinicResponse(username);
                    res.json(utils.responseSuccess(clinic));
                    return
                } else if (result && result.message) {
                    logger.log(new Error(result.message));
                }
                if (err) {
                    logger.log(err);
                }
                res.json(utils.responseFailure("Đã có lỗi xảy ra trong quá trình thanh toán, Vui lòng kiểm tra lại"));
            });
            
        } catch (error) {
            logger.log(error);
            // res.json(utils.responseFailure("Đã có lỗi xảy ra trong quá trình thanh toán, Vui lòng kiểm tra lại"));
        }
    });
    return apiRouter;
}

async function handleBuyLicense(username, licenseID) {
    var promises = [baseDao.findByID(db.Clinic, "username", username), baseDao.findByID(db.License, "licenseID", licenseID)];

    var result = await Promise.all(promises);
    if (result && result.length > 1) {
        clinic = result[0];
        license = result[1];
        if (!clinic || !license) {
            throw new Error("Null Pointer for Clinic or License");
        }

        addExpiryDate(clinic, license);

        var bill = {
            clinicUsername: clinic.username,
            licenseID: license.licenseID,
            saleDate: new Date(),
            salePrice: license.price
        }

        var json = { "username": clinic.username, "expiredLicense": clinic.expiredLicense };
        var makeBillPromises = [baseDao.create(db.Bill, bill), baseDao.update(db.Clinic, json, "username")];
        await Promise.all(makeBillPromises);
    }
}

function addExpiryDate(clinic, license) {
    var expiredLicense = clinic.expiredLicense;
    if (!expiredLicense || expiredLicense < new Date()) {
        var expiredLicense = new Date();
        expiredLicense.setHours(0, 0, 0, 0);
    }

    var days = license.duration == null ? 0 : license.duration + 1;
    expiredLicense.setTime(expiredLicense.getTime() + days * 86400000);
    clinic.expiredLicense = expiredLicense;
}
