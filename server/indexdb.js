/* jshint esversion:6 */
var path      = require('path');
var mysqlWrap = require('./mysql_wrap.js');
var fs        = require('fs');

var IndexDB = function(config) {
    this.config = config;

    if (this.config.conn_params) {
        if (this.config.conn_params.ssl && 
            this.config.conn_params.ssl.ca_file) {
            this.config.conn_params.ssl.ca = fs.readFileSync(
                __dirname + '/' + this.config.conn_params.ssl.ca_file
            );
            delete this.config.conn_params.ssl.ca_file;
        }

        if (this.config.conn_params.pw_path) {
            var new_conn_params = require(this.config.conn_params.pw_path);
            delete this.config.conn_params.pw_path;
            var tthis = this;
            Object.keys(this.config.conn_params).forEach(function(n) {
                new_conn_params[n] = tthis.config.conn_params[n];
            });
            this.config.conn_params = new_conn_params;
        }
    }
    mysqlWrap.call(this, config);

    IndexDB.prototype.listByDate = function(fromd, tod, cb) {
        var qs = [
            'SELECT * from',
            config.name + '.measurements',
            'WHERE stdate between ? and ?',
            ';'
        ].join(' ');
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
        vals = [ fromd, tod ];
        // console.log(vals);
        this.qwrap({sql: qs, timeout: 1000, values: vals},function(lerr,lres) {
            if (lerr) console.log(lerr);
            // console.log(JSON.stringify(lres,null,2));
            return cb(lerr, lres);
        });
    };

    IndexDB.prototype.store = function(devname, dtype, durl, devdata, cb) {
        var qs, vals;
        switch (dtype) {
            case 'radiation':
                
                qs = [
                    'INSERT INTO',
                    config.name + '.measurements',
                    '(sensor_name,stdate,data_type,data_url,peak_cpm,peak_bin)',
                    'VALUES(?,?,?,?,?,?)',
                    ';'
                ].join(' ');
                if (!devdata.top_bins) console.log('devdata no top bins', devdata);
                var peak = devdata.top_bins.pop();
                // iv top bin was 4095 that is ... I dunno ... a catchall for
                // everything above the highest energy level? We probably do 
                // not want it.
                if (peak.bin == 4095) peak = devdata.top_bins.pop();
                vals = [ devname, new Date(), dtype, durl, peak.val, peak.bin ];
                // console.log(vals);
                break;
            case 'image':
                var lcount = 0;
                if (devdata.labels) lcount = devdata.labels.length;
                var l1 = null;
                var l2 = null;
                var l1_conf = null;
                var l2_conf = null;
                if (lcount >= 1) {
                    l1 = devdata.labels[0].Name;
                    l1_conf = devdata.labels[0].Confidence;
                }
                if (lcount >= 2) {
                    l2 = devdata.labels[1].Name;
                    l2_conf = devdata.labels[1].Confidence;
                }
                qs = [
                    'INSERT INTO',
                    config.name + '.measurements',
                    '(sensor_name,stdate,data_type,data_url,object1,object1_conf,object2,object2_conf)',
                    'VALUES(?,?,?,?,?,?,?,?)',
                    ';'
                ].join(' ');
                vals = [ devname, new Date(), dtype, durl, l1, l1_conf, l2, l2_conf ];
                break;
            case 'default':
                qs = [
                    'INSERT INTO',
                    config.name + '.measurements',
                    '(sensor_name,stdate,data_type,data_url)',
                    'VALUES(?,?,?,?)',
                    ';'
                ].join(' ');
                vals = [ devname, new Date(), dtype, durl ];
                break;
        }

        this.qwrap({sql: qs, timeout: 1000, values: vals},function(sterr,stres) {
            return cb(sterr,stres);
        });
    };

    IndexDB.prototype.create_dtable  = function(cb) {
        var qs = [
            'CREATE TABLE IF NOT EXISTS',
            config.name + '.measurements',
            '(',
            'id INT NOT NULL UNIQUE AUTO_INCREMENT,',
            'data_type VARCHAR(20),',
            'data_url  VARCHAR(256),',
            'sensor_name VARCHAR(80),',
            'stdate DATETIME,',
            'peak_cpm FLOAT default NULL,',
            'peak_bin INTEGER default NULL,',
            'object1 VARCHAR(40) default NULL,',
            'object1_conf FLOAT default NULL,',
            'object2 VARCHAR(40) default NULL,',
            'object2_conf FLOAT default NULL,',
            'PRIMARY KEY ( id ),',
            'KEY ( stdate ),',
            'KEY ( sensor_name )',
            ')',
            'default charset=latin1',
            ';',
        ].join(' ');
        vals = [ config.max_name_length ];
        this.qwrap({sql: qs, values: vals},function(err, rows) {
            if (err) {
                console.log(err);
                return cb(err,null);
            }
            console.log(rows);
            return cb(err, rows);
        });
    };
};

IndexDB.prototype = Object.create(mysqlWrap.prototype);
IndexDB.constructor = IndexDB;
module.exports =  IndexDB;

if (require.main == module) {
    var config = require('./aws_config.json');
    db = new IndexDB(config.mysql);
    db.create_dtable(function() { });
}

