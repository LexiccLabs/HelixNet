const multer = require('multer');
const upload = multer()
var fs = require('fs');
const fileServiceModule = require('./fileService')
const tokenServiceModule = require('./tokenService')
const sqlServices = require('./sqlServices')
const router = require('express').Router();
const HederaClient = require('./hedera-client');
var path = require('path');

const {
    PrivateKey
} = require("@hashgraph/sdk");


//A new patients id proof will be save to file service and return national_id.
//This fileid will be added to the patient details json object and store in file service, which returns patientsFileId
//This file service is added to the token's symbol and new token is created.
//this new token is used for the future reference.

router.post('/verifierRegistration', upload.single('vault_id'), async (req, res) => {
    console.log("vault verifier registration")
    try {
        var name = req.query.name
        var vault_address = req.query.address
        var id = req.query.id
        var vault_id = req.query.national_id


        var output = {}

        let errors = false;
        if (name.length === 0 || address.length === 0 || vault_nonce.length === 0 || vault_key.length === 0) {
            errors = true;
            output["status"] = false
            res.send(output)
            return

        }
        let fileId = "";

        //create file service in hedera for vault_id
        if (req.file) {
            try {
                const base64 = await fileServiceModule.encodeFileToBase64(req.file)
                fileId = await fileServiceModule.fileCreate(JSON.stringify(base64));
            } catch (err) {
                console.log('error in upload', err)
            }
        }
        console.log('fileId', fileId)

        const patientDets = {
            name: name,
            address: address,
            fileId: fileId != "" ? fileId : ""
        }

        let patientFileId;

        // create file service for patient details
        if (patientDets) {
            try {
                var patientDetsJSONStrt = JSON.stringify(patientDets)
                var jsonBase64 = new Buffer.from(patientDetsJSONStrt).toString("base64");
                var jsonBase64Str = (JSON.stringify(jsonBase64));
                patientFileId = await fileServiceModule.fileCreate(jsonBase64Str);
            } catch (err) {
                console.log('error in upload', err)
            }
        }

        const privateKey = await PrivateKey.generate();
        const tokenName = vaccine_name
        const isKyc = ""
        let message = "msg:" + VaultVerifierID;
        console.log('VaultVerifierID', VaultVerifierID)

        //building token details
        if (patientFileId != "") {
            const treasury_account_id = process.env.TREASURY_ACCOUNT_ID;
            const token = {
                name: tokenName,
                symbol: patientFileId !== "" ? message : undefined,
                decimals: 0,
                initialSupply: 1,
                adminKey: undefined,
                kycKey: isKyc !== "" ? privateKey.toString() : undefined,
                freezeKey: undefined,
                wipeKey: undefined,
                supplyKey: undefined,
                defaultFreezeStatus: undefined,
                autoRenewAccount: treasury_account_id,
                treasury: treasury_account_id,
                deleted: false,
                key: privateKey.toString(),
                message: patientFileId !== "" ? message : ""
            };

            //create token with patient details
            const newToken = await tokenServiceModule.tokenCreate(token);
            if (newToken.status == true) {
                const response = {
                    status: newToken.status,
                    fileId: fileId,
                    patientId: patientFileId,
                    name: name,
                    address: address,
                    id: id,
                    VaultVolumeToken: {
                        status: newToken.status,
                        tokenId: newToken.tokenId,
                        token_private_key: newToken.token_private_key,
                        token_public_key: newToken.token_public_key
                    }
                };
                const saveToken = sqlServices.hederaClientLocal(response, id);
                res.send(response);
                console.log('newToken', response)
            }


        }
    } catch (error) {
        console.log(error);
        res.json({ "status": false });
    }
});

router.route('/getTokenInfo').post(async (req, res) => {

    const token = {}
    token.tokenId = req.query.tokenId
    const id = req.query.tokenId
    const info = await tokenServiceModule.tokenGetInfo(token)
    if(info.status == true){
        let symbol = info.symbol
        console.log('symbol',symbol)
        let patientId = info.symbol.replace("MSG:", "");
        console.log('patientId',patientId)
        const patientFileData = await fileServiceModule.fileGetContents(patientId);
        const patientDets = await fileServiceModule.fileToJSON(patientFileData);
        console.log('patientDets',patientDets)
        const response = {
            status: info.status,
            fileId: patientDets.fileId,
            patientId: patientId,
            name: patientDets.name,
            address: patientDets.address,
            id: id,
            patientVaccineToken: {
                status: info.status,
                tokenId: info.tokenId,
                token_private_key: "",
                token_public_key: ""
            }
        };
        res.json(response)
  
    }else{
        res.json({ "status": false });
    }

    

})
module.exports = router;
