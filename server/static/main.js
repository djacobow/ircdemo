/* jshint esversion:6 */
console.log('start');
var senselems = {};
var current_results = {};

var getDataElementFromDottedName = function(data,name) {
    var d = data;
    var names = name.split(/\./);
    try {
        while (names.length) {
            n = names.shift();
            d = d[n];
        }
    } catch(e) {
        dataval = '_missing';
    }

    if (typeof d === 'object') {
        d = JSON.stringify(d);
    }

    return d;
};

var makeDataTable = function(target, data, names) {
    removeChildren(target);
    var tbl = document.createElement('table');
    tbl.className = 'datatable';
    tbl.wdith = '100%';
    target.appendChild(tbl);
    var pns = Object.keys(names);
    for (var i=0;i<pns.length;i++) {
        var friendly_name = pns[i];
        var data_name = names[friendly_name].n;
        var unit = names[friendly_name].u;

        var dataval = getDataElementFromDottedName(data,data_name);

        try {
            var tr = document.createElement('tr');
            var td0 = document.createElement('td');
            var td1 = document.createElement('td');
            tr.appendChild(td0);
            tr.appendChild(td1);
            td0.innerText = friendly_name;
            td1.innerText = dataval + ' ' + unit;
            tbl.appendChild(tr);
        } catch (e) {
        }
    }
    return tbl;
};

var makeUL_old = function(target, data, names) {
    removeChildren(target);
    var ul = document.createElement('ul');
    target.appendChild(ul);
    var pns = Object.keys(names);
    for (var i=0;i<pns.length;i++) {
        var friendly_name = pns[i];
        var data_name = names[friendly_name].n;
        var unit = names[friendly_name].u;

        var dataval = getDataElementFromDottedName(data,data_name);

        try {
            var li = document.createElement('li');
            li.innerText = friendly_name + ': ' + dataval + ' ' + unit;
            ul.appendChild(li);
        } catch (e) {
        }
    }
    return ul;
};

var makeChartPanel = function(name, d) {
    // console.log(d.sensor_data.radiation);
    var td0 = senselems[name].td0;    
    td0.className = 'chartpanel';
    removeChildren(td0);

    var title = document.createElement('a');
    title.innerText = name;
    title.href = 'app/status/' + name;
    td0.appendChild(title);
     
    var cdiv = document.createElement('div');
    td0.appendChild(cdiv);
    var carry = [];
    carry.push(['bin','count']);
    for (var j=0;j<d.sensor_data.radiation.spectrum.length;j++) {
        carry.push([j,d.sensor_data.radiation.spectrum[j]]);
    }

    makeChartFromArray('line',
                       cdiv,
                       carry,
                       {'title':name});
};

var tablenames = {
    sensor_fields: {
        'Neutron Count': { n: 'neutron_count', u: '' },
        'Integration Time': { n: 'time', u: 'ms' },
        'Temperature': { n: 'temperature', u: '\u2103' },
        'Device Serial': { n: 'serial', u: '' },
        'Gain': {n : 'gain', u: '' },
        'Bias': {n : 'bias', u: '' },
        'LLD (gamma)': { n: 'lld-g', u: '' },
        'LLD (neutron)': { n: 'lld-n', u: '' },
        'Battery Level': { n: 'batteryLevel', u: '%' },
        'Charge Rate': { n: 'batteryChargeRate', u: '' },
        'Battery Temp': { n: 'batteryTemperature', u: '\u2103' },
    },
    message_fields: {
        'Date': { n: 'date', u: '' },
        'Node Name': { n: 'node_name', u: '' },
        // 'host.ip': { n: 'diagnostic.host.ip', u: '' },
        'host.public_ip': { n: 'diagnostic.host.public_ip', u: '' },
        'host.name': { n: 'diagnostic.host.name', u: '' },
        'host.uptime': { n: 'diagnostic.host.uptime', u: '' },
        'service.uptime': { n: 'diagnostic.service.uptime', u: '' },
        'Type': { n: 'source_type', u: '' },
    },
};

var makeKromekPanel = function(name, d) {
    var td2 = senselems[name].td2;    
    td2.className = 'kromekpanel';
    makeDataTable(td2, d.sensor_data.radiation, tablenames.sensor_fields);
};

var addLocalIPs = function(d) {
    var tr = document.createElement('tr');
    var ips = {};
    if (d && d.diagnostic && d.diagnostic.host && d.diagnostic.host.ifaces) {
        var ifnames = Object.keys(d.diagnostic.host.ifaces);
        for (var i=0; i<ifnames.length; i++) {
            var ifn = ifnames[i];
            if (ifn != 'lo') {
                var ifd = d.diagnostic.host.ifaces[ifn];
                if (ifd) {
                    var inet = ifd[2];
                    if (inet) {
                        var first_inet = inet[0];
                        if (first_inet) {
                            var addr = first_inet.addr;
                            if (addr) ips[ifn] = addr;
                        }
                    }
                }
            }
        }
    }
    var td0 = document.createElement('td');
    var td1 = document.createElement('td');
    tr.appendChild(td0);
    tr.appendChild(td1);
    td0.innerText = 'host.ifaces';
    td1.innerText = JSON.stringify(ips);
    return tr;
};

var makeDiagPanel = function(name, d) {
    var td3 = senselems[name].td3;    
    td3.className = 'diagpanel';
    var tbl= makeDataTable(td3, d, tablenames.message_fields);
    tbl.appendChild(addLocalIPs(d));
    
    var el = document.createElement('p');
    now = new Date();
    var latest = new Date(0);
    if (d.date) latest = new Date(d.date);
    if (d.ping && d.ping.date) {
        var x = new Date(d.ping.date);
        if (x > latest) latest = x;
    }

    if ((now - latest) > (5 * 60 * 1000)) {
        el.innerText = 'Device is DOWN';
        el.style.color = 'red';
    } else {
        el.innerText = 'Device is UP';
        el.style.color = 'green';
    }
    td3.appendChild(el);
};


var getSensorList = function(cb) {
    console.log('getSensorList()');
    getJSON('/demo1/app/sensornames', function(err, data) {
        if (err) {
            console.log('Error getting sensor list: ' + err);
            return cb(err);
        } else {
            return cb(null,data);
        }
    });
};

var makeImage = function(name, cb) {
    console.log('makeImage()');
    var img = senselems[name].img;    
    getJSON('/demo1/app/image/' + name, function(err, new_img) {
        if (err) {
            console.log('ERR: ' + err);
            return cb(err);
        }
        if (new_img && new_img.image_jpeg) {
            img.src = 'data:image/jpeg;base64,' + new_img.image_jpeg;
            return cb();
        }
        return cb('no_image');
    });
};

var checkData = function(name, cb) {
    console.log('checkData()');
    getJSON('/demo1/app/status/' + name, function(err, new_data) {
        var old_data = current_results[name];
    
        if (err) {
            console.log('checkData err: ' + err);
            return cb('err');
        } else if (!new_data || !old_data) {
            console.log('checkData err, missing sensor');
            return cb('err missing sensor');
        } else if (new_data) {
            console.log('checkData ok');
            var old_data_date = new Date(old_data.date || 0);
            var new_data_date = new Date(new_data.date);
            var old_ping_date  = old_data_date;
            if (old_data.hasOwnProperty('ping')) {
                old_ping_date = new Date(old_data.ping.date);
            }
            var new_ping_date  = old_ping_date;
            if (new_data.hasOwnProperty('ping')) {
                new_ping_date = new Date(new_data.ping.date);
            }
            var refresh   = !old_data || 
                            (new_data_date > old_data_date);
            var new_ping  = (new_ping_date > old_ping_date);


            if (false) {
                console.log('old_data_date: ' + old_data_date);
                console.log('new_data_date: ' + old_data_date);
                console.log('old_ping_date: ' + old_ping_date);
                console.log('new_ping_date: ' + old_ping_date);
                console.log('refresh: ' + refresh);
                console.log('new_ping: ' + new_ping);
            } 

            if (refresh) {
                makeChartPanel(name, new_data);
                makeKromekPanel(name, new_data);
                makeDiagPanel(name, new_data);
            }

            current_results[name] = new_data;
            return cb(null,new_data);
        } else {
            return cb('skip');
        }
    });
};


var makeDeviceLayout = function(senslist,cb) {
    console.log('makeDeviceLayout()');
    var topdiv = document.getElementById('topdiv');
    var toptable = document.createElement('table');
    toptable.style.width = "100%";
    topdiv.appendChild(toptable);
    for (var i=0;i < senslist.length; i++) {
        var cname = senslist[i];
        var ntr = document.createElement('tr');
        toptable.appendChild(ntr);
        td0 = document.createElement('td');
        td1 = document.createElement('td');
        td2 = document.createElement('td');
        td3 = document.createElement('td');
        td0.style.width = "40%";
        td1.style.width = "30%";
        td2.style.width = "15%";
        td3.style.width = "15%";
        var img1 = document.createElement('img');
        td1.appendChild(img1);
        ntr.appendChild(td0);
        ntr.appendChild(td1);
        ntr.appendChild(td2);
        ntr.appendChild(td3);
        senselems[cname] = {
            tr: ntr,
            td0: td0,
            td1: td1,
            td2: td2,
            td3: td3,
            img: img1,
        };
        current_results[cname] = {
            valid: false,
            busy: false,
            date: '',
        };
    }
    return cb();
};

var pollResultHandler = function(pollres) {
    var rad_targets = {};
    var img_targets = {};
    
    Object.keys(pollres).forEach(function(evname) {
        Object.keys(pollres[evname]).forEach(function(devname) {
            pollres[evname][devname].forEach(function(dtype) {
                if (dtype == 'radiation') rad_targets[devname] = 1;
                if (dtype == 'image')     img_targets[devname] = 1;
            });
        });
    });

    async.each(Object.keys(rad_targets), function(devname, cb) {
        checkData(devname, function(cerr, cd) {
            cb();
        });
    },function(err) {
    });

    async.each(Object.keys(img_targets), function(devname, cb) {
        makeImage(devname, function(cerr, cd) {
            cb();
        });
    },function(err) {
    });

};

var rePoll = function(cb, sid = 999999) {
    url = '/demo1/app/poll?id=' + sid;
    rerunner = function() { rePoll(cb, sid); };
    try {
        getJSON(url, function(pollerr, pollres) {
            if (pollerr) {
                console.log('Poll Err: ' + pollerr);
                window.setTimeout(rerunner, 1000);
            } else {
                
                console.log('Poll res: ' + JSON.stringify(pollres,null,2));
                cb(pollres);
                window.setTimeout(rerunner, 250);
            }
        });
    } catch (e) {
        console.log('Poll went sideways: ' + JSON.stringify(e,null,2));
        window.setTimeout(rerunner, 1000);
    }
};

var init = function() {
    var session_id = makeRandomString(10);
    google.charts.load('current', {'packages':['corechart','bar']});
    google.charts.setOnLoadCallback(function() {
        console.log('google charts loaded');
        getSensorList(function(err,insensors) {
            console.log(insensors);
            if (!err) {
                makeDeviceLayout(insensors, function() {
                    rePoll(pollResultHandler, session_id);
                    // startTimer();
                });
            }
        });
    });
};



init();


