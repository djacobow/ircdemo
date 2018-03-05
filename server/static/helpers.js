/* jshint esversion:6 */

var gebi = function(en) {
    return document.getElementById(en);
};

var cr = function(what, clsn = null, it = null) {
    var x = document.createElement(what);
    if (clsn) {
        x.className = clsn;
    }
    if (it) {
        x.innerText = it;
    }
    return x;
};

var removeChildren = function(n) {
    while (n.hasChildNodes()) n.removeChild(n.lastChild);
};


var makeRandomString = function(l) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMOPQRSTUVWXYZ0123456789';
    while (l--) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var getJSON = function(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (this.readyState == 4) {
            if (this.status == 200) {
                var data = JSON.parse(this.responseText);
                return cb(null, data, url);
            }
            return cb('err', null, url);
        }
    };
    xhr.open('GET',url);
    xhr.send();
};


var getJSON = function(url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if ((this.readyState == 4) && (this.status == 200)) {
            var data = JSON.parse(this.responseText);
            return cb(null, data, url);
        }
    };
    xhr.open('GET',url);
    xhr.send();
};

var makeChartFromArray = function(type, target, data, options = null) {
    console.log('makeChartFromArry()');
    var drawChart = function() {
        console.log('drawChart()');
        var cdata = google.visualization.arrayToDataTable(data);
        var chart = null;
        switch (type) {
            case 'bar': 
                chart = new google.visualization.ColumnChart(target); 
                break;
            case 'pie': 
                chart = new google.visualization.PieChart(target); 
                break;
            case 'line': 
                chart = new google.visualization.LineChart(target); 
                break;
            default:
                chart = new google.visualization.ColumnChart(target); 
        }

        chart.draw(cdata, options);
    };
    drawChart();
};


var roundDate = function(din, round_to_secs) {
    var din_epoch = din.getTime();
    var dout_epoch = 1000 * round_to_secs * Math.floor(din_epoch / (1000 * round_to_secs) + 0.5);
    return new Date(dout_epoch);
};

var formatDateCompact = function(din) {
    if (typeof din == 'string') din = new Date(din);
    return [
        din.getFullYear(),
        '/',
        din.getMonth() + 1,
        '/',
        din.getDate(),
        ' ',
        din.getHours(),
        ':',
        din.getMinutes(),
        ':',
        din.getSeconds(),
    ].join('');
};



