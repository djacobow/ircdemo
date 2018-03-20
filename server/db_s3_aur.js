var path = require('path');
var aws  = require('aws-sdk');
var IndexDB = require('./indexdb.js');

var DataDB = function(config) {
    this.config = config;
    aws.config.loadFromPath(config.aws.cred_path);
    this.docClient = new aws.DynamoDB.DocumentClient();
    this.s3 = new aws.S3({
        params: {
            Bucket: config.aws.bucket_name,
        },
    });
    this.indexdb = new IndexDB(config.mysql);
};

DataDB.prototype.getByID = function(id, cb) {
    var p = {
        Bucket: this.bucket_name,
        Key: id,
    };

    this.s3.getObject(p, function(err, data) {
        if (err) {
            console.error(err, err.stack);
            return cb(err);
        }
        var d = null;
        try {
            d = JSON.parse(data.Body);
        } catch (e) {
            console.error(e);
            return cb(e);
        }
        return cb(null,d);
    });
};

DataDB.prototype.listByDate = function(fromd, tod, cb) {
    return this.indexdb.listByDate(fromd, tod, cb);
};

DataDB.prototype.store = function(devname, dtype, devdata, cb) {

    var now = new Date();
    var id_str = devname + '__' + dtype + '__' + now.getTime();

    var p = {
        Bucket: this.config.aws.bucket_name,
        Key: id_str,
        Body: JSON.stringify(devdata),
        ACL: 'public-read',
    };
    var tthis = this;
    this.s3.upload(p,function(ue,ud) {
        if (ue) {
            console.error('Problem storing to S3', ue);
            return cb(ue);
        }

        tthis.indexdb.store(devname, dtype, ud.Location, devdata, function(se,sd) {
            if (se) {
                console.error(
                    'unable to store datum', 
                    JSON.stringify(se,null,2),
                    JSON.stringify(sd,null,2));
                return cb(se,sd);
            }
            return cb(null,sd);
   
        });
    });
};

module.exports = DataDB;


if (require.main == module) {
    var config = require('./aws_config.json');
    db = new DataDB(config);

    /*
    db.store('bloopy','testtest', {ping: 1, boop: [4,5,6]}, function(e,d) {
        if (e) console.err(e);
        if (d) console.log(d);
    });
    */
}
