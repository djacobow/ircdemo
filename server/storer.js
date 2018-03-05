/* jshint esversion:6 */
var path      = require('path');
var mysqlWrap = require('./mysql_wrap.js');

var DataDB = function(config) {
    this.config = config;
    mysqlWrap.call(this, config);

    DataDB.prototype.getByID = function(id, cb) {
        var qs = [
            'select * from',
            config.name + '.measurements',
            'where id = ?',
            ';'
        ].join(' ');
        vals = [ id ];
        this.qwrap({sql: qs, timeout: 1000, values: vals},function(lerr,lres) {
            if (lerr) console.log(lerr);
            if (!lres.length) return cb('no_result');
            var datum = lres[0];
            try {
                datum.data = JSON.parse(datum.data);
            } catch (e) {
                datum.data = {err:'Problem parsing JSON string.'};
            }
            return cb(lerr, datum);
        });
    };

    DataDB.prototype.listByDate = function(fromd, tod, cb) {
        var qs = [
            'SELECT id, sensor_name, data_type, date FROM',
            config.name + '.measurements',
            'WHERE date between ? and ?',
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
        this.qwrap({sql: qs, timeout: 1000, values: vals},function(lerr,lres) {
            if (lerr) console.log(lerr);
            return cb(lerr, lres);
        });
    };

    DataDB.prototype.store = function(devname, dtype, devdata, cb) {
        var qs = [
            'INSERT INTO',
            config.name + '.measurements',
            '(sensor_name,date,data_type,data)',
            'VALUES(?,?,?,?)',
            ';'
        ].join(' ');
        vals = [ devname, new Date(), dtype, JSON.stringify(devdata) ];
        this.qwrap({sql: qs, timeout: 1000, values: vals},function(sterr,stres) {
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
            'date DATETIME,',
            'data_type VARCHAR(20),',
            'data JSON,',
            'PRIMARY KEY ( id ),',
            'KEY ( date ),',
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

DataDB.prototype = Object.create(mysqlWrap.prototype);
DataDB.constructor = DataDB;
module.exports =  DataDB;

if (require.main == module) {

    var config = require('./mysql_creds.json');
    db = new DataDB(config.db);
    db.create_dtable(function() { });
}

