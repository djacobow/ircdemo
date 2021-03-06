/*jshint esversion: 6 */
var lp      = require('./LongPoller.js');
var helpers = require('./helpers.js');

var RUN_REKOGNITION = false;

if (RUN_REKOGNITION) {
    var aws     = require('aws-sdk');
    aws.config.loadFromPath('./aws_creds.json');
}


// A couple choices here...
var backends = {
    'local_mysql': './db_mysql.js',
    's3+dynamo'  : './db_s3_dyn.js',
    's3+aurora'  : './db_s3_aur.js',
};

var my_backend = 's3+aurora';

var storer = require(backends[my_backend]);

var AppRoutes = function(app_config, dataacceptor) {
    this.config = app_config;
    this.da = dataacceptor;
    this.lp = new lp();
    this.st = new storer(
        my_backend == 'local_mysql' ? require('./mysql_creds.json').db : require('./aws_config.json')
    );
    this.da.setHook('push',this.lp.newChange.bind(this.lp));
    this.da.setHook('push',this.dbstore.bind(this));
    this.da.setHook('ping',this.lp.newChange.bind(this.lp));
    if (RUN_REKOGNITION) {
        this.rekognition = new aws.Rekognition();
    } else {
        this.rekognition = null;
    }
};

AppRoutes.prototype.setupRoutes = function(router) {
    router.get('/sensornames',   this.handleListDevicesGet.bind(this));
    router.get('/status/:name',  this.handleStatusGet.bind(this));
    router.get('/image/:name',   this.handleImageGet.bind(this));
    router.get('/poll',          this.lp.poll.bind(this.lp));
    router.get('/history',       this.handleListSamplesGet.bind(this));
    router.get('/sample/:id',    this.handleSampleGet.bind(this));
};

AppRoutes.prototype.handleSampleGet = function(req, res) {
    console.debug('GET sample');
    var id= req.params.id;
    if (!id) {
        res.status = 400;
        return res.json({err:'missing_id',messsage:'provide an object id'});
    }
    var tthis = this;
    this.st.getByID(id,function(gerr,gres) {
        if (gerr) return tthis.noGood(res, gerr);
        return res.json(gres);
    });
};

AppRoutes.prototype.noGood = function(res,err,message = '') {
   res.status = 400;
   if (message.length) {
       return res.json({err:err,message:message});
   } else {
       return res.json({err:err});
   }    
};


AppRoutes.prototype.handleListSamplesGet = function(req, res) {
    console.debug('GET list samples');
    var fromd = req.query.from;
    var tod = req.query.to;
    if (!fromd || !tod) {
        return this.noGood(res, 'missing_params','missing to and from data params');
    }
    try {
        fromd = new Date(fromd);
        tod   = new Date(tod);
    } catch (e) {
        fromd = null;
        tod   = null;
    }     
    if (!fromd || !tod) {
        return this.noGood(res, 'params_not_dates','to and from must be valid dates');
    }
    var tthis = this;
    this.st.listByDate(fromd, tod, function(lerr,lres) {
        if (lerr) return tthis.noGood(res, 'query error',lerr);
        return res.json(lres);
    });
};

AppRoutes.prototype.handleListDevicesGet = function(req, res) {
    console.log('GET list of sensors');
    var devlist = this.da.getdevicelist();
    res.json(devlist);
};

AppRoutes.prototype.rekognize = function(devname, dtype, devdata, finish) {
    if (this.rekognition) {
        var parms = {
            Image: {
                Bytes: Buffer.from(devdata.image_jpeg,'base64'),
            },
            MaxLabels: 20,
            MinConfidence: 55,
        };
        this.rekognition.detectLabels(parms, function(rekerr, rekdata) {
            if (!rekerr) devdata.labels = rekdata.Labels;
            return finish(devname,dtype,devdata);
        });
    } else {
        return finish(devname,dtype,devdata);
    }
};

AppRoutes.prototype.dbstore = function(evname, devname, devdata = null) {
    var tthis = this;
    dtype = '_unknown';
    if (devdata && devdata.data_type) dtype = devdata.data_type;
    
    var finish = function(devname, dtype, devdata) {
        tthis.st.store(devname, dtype, devdata, function(sterr,stres) {
            if (sterr) console.error(sterr);
        });
    };

    if (dtype == 'radiation') {
        // get top bins in and convert to counts per minute
        if (devdata.spectrum) {
            var sorted_spectrum = helpers.sortIndices(devdata.spectrum).slice(-10);
            sorted_spectrum.forEach(function(v) {
                v.val *= (60000 / devdata.time);
            });
            devdata.top_bins = sorted_spectrum;
        }
        return finish(devname, dtype, devdata);
    } else if (dtype == 'image') {
        this.rekognize(devname,dtype,devdata,finish);
    }

};


AppRoutes.prototype.handleImageGet = function(req, res) {
    var name = req.params.name;
    var cstate = this.da.getdevicestate(name) || null;
    rv = {};
    if (cstate) {
        if (cstate.sensor_data.image) {
            rv = cstate.sensor_data.image;
        } else {
            rv.message = 'no image';
        }
    } else {
        rv.message = 'no such sensor';
    }
    return res.json(rv);
};


AppRoutes.prototype.handleStatusGet = function(req, res) {
    // console.log('GET sensor status!');
    var name = req.params.name;
    var cstate = this.da.getdevicestate(name) || null;
    rv = {};
    if (cstate) {
        Object.keys(cstate).forEach(function(k) {
            if (k == 'sensor_data') {
                rv.sensor_data = {};
                Object.keys(cstate[k]).forEach(function(l) {
                    if (l != 'image') {
                        rv.sensor_data[l] = cstate.sensor_data[l];
                    }
                });
            } else {
                rv[k] = cstate[k];
            }
        });
    } else {
        rv.message = 'no such sensor';
    }
    res.json(rv);
};

module.exports = AppRoutes;

