var path = require('path');
var aws  = require('aws-sdk');

var DataDB = function(config) {
    this.config = config;
    console.log(config.cred_path);
    aws.config.loadFromPath(config.cred_path);
    this.docClient = new aws.DynamoDB.DocumentClient();
    this.s3 = new aws.S3({
        params: {
            Bucket: config.bucket_name,
        },
    });
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
    if (typeof fromd.getMonth !== 'function') {
        try {
            fromd = new Date(fromd);
        } catch (e) {
            fromd = new Date();
        }
    }
    if (typeof tod.getMonth !== 'function') {
        try {
            tod = new Date(tod);
        } catch (e) {
            tod = new Date();
        }
    }
    var p = {
        TableName: this.config.table_name,
        FilterExpression: "stdate BETWEEN :lower AND :upper",
        ExpressionAttributeValues: {
            ':lower': fromd.getTime(),
            ':upper': tod.getTime(),
        },
    };
    this.docClient.scan(p,function(e,d) {
        if (e) {
            console.error(JSON.stringify(e,null,2));
            return cb(e);
        }
        if (!d.Count) return cb(null,[]);
        return cb(null,d.Items);
    });
};

DataDB.prototype.store = function(devname, dtype, devdata, cb) {

    var now = new Date();
    var id_str = devname + '__' + dtype + '__' + now.getTime();

    var p = {
        Bucket: this.config.bucket_name,
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

        var p = {
            TableName: tthis.config.table_name,
            Item: {
                id: id_str,
                stdate: now.getTime(),
                data_type: dtype,
                sensor_name: devname,
                data_url: ud.Location,
            },
        };
        tthis.docClient.put(p,function(e,d) {
            if (e) {
                console.error(
                    'unable to store datum', 
                    JSON.stringify(e,null,2),
                    JSON.stringify(d,null,2));
                return cb(e);
            }
            return cb(null,d);
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
