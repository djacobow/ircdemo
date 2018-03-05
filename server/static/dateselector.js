/*jshint esversion: 6 */

var range = function(n,off = 0) {
    return Array.apply(null, Array(n)).map((v,i) => i + off);
};

var elemWText = function(etype,etext = '') {
    var e = document.createElement(etype);
    e.innerText = etext;
    return e;
};

var DateSelector = function(name_stem, target) {
    if (typeof target === 'string') target = document.getElementById(target);
    this.target = target;    
    this.id_stem = name_stem;
    this.fixed = {
        year: [ 
            2018,
        ],
        month: [
            ['Jan', 0],
            ['Feb', 1],
            ['Mar', 2],
            ['Apr', 3],
            ['May', 4],
            ['Jun', 5],
            ['Jul', 6],
            ['Aug', 7],
            ['Sep', 8],
            ['Oct', 9],
            ['Nov', 10],
            ['Dec', 11],
        ],
        day: range(31,1),
        hour: range(24),
        minute: range(60),
    };
};

DateSelector.prototype._build_sel = function(rangename) {
    var range = this.fixed[rangename];
    var s = document.createElement('select');
    s.id = this.id_stem + '_' + rangename;
    for (var i=0; i<range.length; i++) {
        var o = document.createElement('option');
        var v = range[i];
        var txt = v;
        var idx = v;  
        if (Array.isArray(v)) {
            txt = v[0];
            idx = v[1];
        }
        o.value = idx;
        o.text= txt;
        s.appendChild(o);
    }
    return s;
};

DateSelector.prototype.setDate = function(d) {
    var val = [
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
    ];
    var sections = ['year','month','day','hour','minute'];
    
    var tthis = this;
    sections.forEach(function(v,i) {
        document.getElementById(tthis.id_stem + '_' + v).value = val[i];
    });

};

DateSelector.prototype.setToday = function() {
    this.setDate(new Date());
};

DateSelector.prototype.getDate = function() {
    var tthis = this;
    var sections = ['year','month','day','hour','minute'];
    var values = sections.map(function(sname) {
        var id = tthis.id_stem + '_' + sname;
        var v = document.getElementById(id).value;
        return v;
    });
    var d = new Date(values[0],values[1],values[2],values[3],values[4]);
    return d;
};

DateSelector.prototype.build = function() {
    var ys   = this._build_sel('year');
    var mos  = this._build_sel('month');
    var ds   = this._build_sel('day');
    var hs   = this._build_sel('hour');
    var mns  = this._build_sel('minute');

    var sp  = document.createElement('span');
    sp.appendChild(ys);
    sp.appendChild(elemWText('span','/'));
    sp.appendChild(mos);
    sp.appendChild(elemWText('span','/'));
    sp.appendChild(ds);
    sp.appendChild(elemWText('span',' '));
    sp.appendChild(hs);
    sp.appendChild(elemWText('span',':'));
    sp.appendChild(mns);
    this.target.appendChild(sp);
};

