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

    IndexDB.prototype.store = function(devname, dtype, durl, cb) {
        var qs = [
            'INSERT INTO',
            config.name + '.measurements',
            '(sensor_name,stdate,data_type,data_url)',
            'VALUES(?,?,?,?)',
            ';'
        ].join(' ');
        vals = [ devname, new Date(), dtype, durl ];
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
