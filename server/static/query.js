
var dateHolders = {};

var buildDateSelectors = function() {
    dateHolders.start = new DateSelector('start', 'd_start');
    dateHolders.end   = new DateSelector('end', 'd_end');
    Object.keys(dateHolders).forEach(function(n) {
        dateHolders[n].build();
        dateHolders[n].setToday();
    });
};

var startToEnd = function() {
    dateHolders.end.setDate(dateHolders.start.getDate());
};
var endToStart = function() {
    dateHolders.start.setDate(dateHolders.end.getDate());
};

var fetchItem = function(target, item) {
    var id = item.id;
    var url = '/demo1/app/sample/' + id;
    if (item.data_url) url = item.data_url;
    var sensor_name = item.sensor_name;
    getJSON(url, function(err,data) {
        if (err) {
            console.err(err);
            return;
        }
        if (data.data_type == 'image') {
            var cap = cr('div',null,formatDateCompact(data.taken));
            var img = cr('img','listthumb');
            img.src = 'data:image/jpeg;base64,' + data.image_jpeg;
            target.appendChild(cap);
            target.appendChild(img);
            img.addEventListener('click',function(ev) {
                zoomImage(ev,item);
            });
        } else if (data.data_type == 'radiation') {
            var name = sensor_name + ' ' + formatDateCompact(data.read_time);
            var carry = [];
            carry.push(['bin','cpm']);
            var minutes = data.time / 60000;
            for (var j=0;j<data.spectrum.length;j++) {
                carry.push([ j, data.spectrum[j]/minutes ]);
            }
            makeChartFromArray('line', target, carry, 
                { title: name,
                  vAxis: { title: 'cpm', },
                  legend: { position: 'none', },
                });

            target.addEventListener('click',function(ev) {
                zoomChart(ev,item);
            });
        }
    });
};

var unZoom = function() {
    gebi('zoomdiv').style.display = 'none';
    
};

var zoomImage = function(ev,item) {
    var zd = gebi('zoomdiv');
    removeChildren(zd);
    var img = document.createElement('img');
    img.src = ev.target.src;
    img.style.width = "100%";
    zd.appendChild(img);
    zd.style.display = 'block';
};

var zoomChart = function(ev,item) {
    var id = item.id;
    var zd = gebi('zoomdiv');
    var url = '/demo1/app/sample/' + id;
    if (item.data_url) url = item.data_url;
    getJSON(url, function(err,data,url) {
        if (!err) {
            removeChildren(zd);
            var name = item.sensor_name + ' ' + formatDateCompact(data.read_time);
            zd.style.display = 'block';
            var carry = [];
            carry.push(['bin','cpm']);
            var minutes = data.time / 60000;
            for (var j=0;j<data.spectrum.length;j++) {
                carry.push([ j, data.spectrum[j]/minutes ]);
           }
           makeChartFromArray('line', zd, carry, {
               title: name,
               vAxis: { title: 'cpm', },
               legend: { position: 'none', },
           });
        }
    });
};

var showDataList = function(data) {
    var sensor_names = {};
    var bins = {};
    data.forEach(function(datum) {
        var sensor_name = datum.sensor_name;
        if (!sensor_names[sensor_name]) sensor_names[sensor_name] = 1;
        else sensor_names[sensor_name] += 1;
        var data_type = datum.data_type; 
        var raw_date = new Date(datum.stdate);
        var bin_date = roundDate(raw_date, 30); 
   
        if (!bins[bin_date]) 
            bins[bin_date] = {};
        if (!bins[bin_date][sensor_name])
            bins[bin_date][sensor_name] = {};
        if (!bins[bin_date][sensor_name][data_type])
            bins[bin_date][sensor_name][data_type] = [];
        bins[bin_date][sensor_name][data_type].push(datum);
    });

    var table = cr('table');
    var dates = Object.keys(bins).sort();
    var snames = Object.keys(sensor_names).sort();

    var tr0 = cr('tr','listheader');
    var tr1 = cr('tr','listheader');
    var tr0td0 = cr('td',null,'date');
    var tr1td0 = cr('td',null,'');
    tr0td0.width = '200px';
    tr0.appendChild(tr0td0);
    tr1.appendChild(tr1td0);

    snames.forEach(function(sname) {
        var tr0td1 = cr('td','listheader',sname);
        tr0td1.colSpan = 2; 
        tr0td1.width = '500px';
        tr0.appendChild(tr0td1);

        var tr1td1 = cr('td','listheader','spectrum');
        var tr1td2 = cr('td','listheader','images');
        tr1td1.width = '250px';
        tr1td2.width = '250px';
        tr1.appendChild(tr1td1);
        tr1.appendChild(tr1td2);
    });
    table.appendChild(tr0);
    table.appendChild(tr1);

    var rowcount = 0;
    dates.forEach(function(date) {
        var tr = cr('tr',(rowcount % 2) ? 'list_even' : 'list_odd');
        table.appendChild(tr);
        var tdd = cr('td');
        tr.appendChild(tdd);
        var dparts = new Date(date).toISOString().split(/T/);
        tdd.innerText = dparts[0] + "\n" + dparts[1];
        snames.forEach(function(sname) {
            var tdr = cr('td');
            var tdi = cr('td');
            tr.appendChild(tdr);
            tr.appendChild(tdi);
            // console.log(date, sname);
            var datebin = bins[date];
            if (datebin[sname]) {
                // console.log('sname:' + sname);
                Object.keys(datebin[sname]).forEach(function(data_type) {
                    datebin[sname][data_type].forEach(function(item) {
                        if (data_type == 'radiation') {
                            var d = cr('div');
                            tdr.appendChild(d);
                            fetchItem(d, item);
                        } else if (data_type == 'image') {
                            var i = cr('div');
                            tdi.appendChild(i);
                            fetchItem(tdi, item);
                        }
                    });
                });
            } else {
                console.log('datebin has no sname',sname, datebin);
            }
        });
        rowcount += 1;
    });
    var dl = gebi('datalist');
    removeChildren(dl);
    dl.appendChild(table); 
};

var getDataList = function(ev) {
    var start_date = encodeURIComponent(dateHolders.start.getDate().toISOString());
    var end_date   = encodeURIComponent(dateHolders.end.getDate().toISOString());

    var url = '/demo1/app/history?' +
              'from=' + start_date + '&' +
              'to=' + end_date; 
    getJSON(url, function(err,data) {
        if (err) console.err(err);
        else showDataList(data);
    });

};

var setHooks = function() {
    gebi('start_query').addEventListener('click',getDataList);
    gebi('copy_end_to_start').addEventListener('click',endToStart);
    gebi('copy_start_to_end').addEventListener('click',startToEnd);
    gebi('zoomdiv').addEventListener('click',unZoom);
};


var start = function() {
    google.charts.load('current', {'packages':['corechart','bar']});
    google.charts.setOnLoadCallback(function() {
        buildDateSelectors();
        setHooks();
    });
};


start();

