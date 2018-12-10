/* jshint esversion:6 */
var path      = require('path');
var mysqlWrap = require('./mysql_wrap.js');
var fs        = require('fs');

var DataDB = function(config) {
    this.config = config;
    mysqlWrap.call(this, config);

    if (this.config.conn_params &&
        this.config.conn_params.ssl && 
        this.config.conn_params.ssl.ca_file) {
        this.config.conn_params.ssl.ca = fs.readFileSync(
            __dirname + '/' + this.config.conn_params.ssl.ca_file
        );
        delete this.config.conn_params.ssl.ca_file;
    }
    console.debug(this.config);

    DataDB.prototype.getByID = function(id, cb) {
        var qs = [
            'select * from',
            config.name + '.measurements',
            'where id = ?',
            ';'
        ].join(' ');
        vals = [ id ];
        this.qwrap({sql: qs, timeout: 4000, values: vals},function(lerr,lres) {
            if (lerr) console.error(lerr);
            if (!lres.length) return cb('no_result');
            var datum = lres[0];
            try {
                datum.data = JSON.parse(datum.data);
            } catch (e) {
                datum.data = {err:'Problem parsing JSON string.'};
            }
            return cb(lerr, datum.data);
        });
    };

    DataDB.prototype.listByDate = function(fromd, tod, cb) {
        var qs = [
            'SELECT id, sensor_name, data_type, stdate FROM',
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
        this.qwrap({sql: qs, timeout: 4000, values: vals},function(lerr,lres) {
            if (lerr) console.error(lerr);
            return cb(lerr, lres);
        });
    };

    DataDB.prototype.store = function(devname, dtype, devdata, cb) {
        var qs = [
            'INSERT INTO',
            config.name + '.measurements',
            '(sensor_name,stdate,data_type,data)',
            'VALUES(?,?,?,?)',
            ';'
        ].join(' ');
        vals = [ devname, new Date(), dtype, JSON.stringify(devdata) ];
        this.qwrap({sql: qs, timeout: 4000, values: vals},function(sterr,stres) {
            return cb(sterr,stres);
        });
    };

    DataDB.prototype.create_dtable  = function(cb) {
        var qs = [
            'CREATE TABLE IF NOT EXISTS',
            config.name + '.measurements',
            '(',
            'id INT NOT NULL UNIQUE AUTO_INCREMENT,',
            'sensor_name VARCHAR(?) COLLATE latin1_general_cs,',
            'stdate DATETIME,',
            'data_type VARCHAR(20),',
            'data JSON,',
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
                console.error(err);
                return cb(err,null);
            }
            console.debug(rows);
            return cb(err, rows);
        });
    };
};

DataDB.prototype = Object.create(mysqlWrap.prototype);
DataDB.constructor = DataDB;
module.exports =  DataDB;

if (require.main == module) {

    var config = require('./mysql_creds_local.json');
    db = new DataDB(config.db);
    db.create_dtable(function() { });
}

