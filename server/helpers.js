
var sortIndices = function(arr) {
    len = arr.length;
    var indices = new Array(len);
    for (var i=0; i<len; i++) indices[i] = { bin: i, val: arr[i] };
    var sfn = function(a,b) {
        return (a.val < b.val) ? -1 :
               (a.val > b.val) ?  1 : 0;
    };
    indices.sort(sfn);
    return indices;
};


module.exports = { 
    sortIndices: sortIndices,
};


