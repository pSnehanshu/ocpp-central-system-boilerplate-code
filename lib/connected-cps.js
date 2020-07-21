const connected_cps = {};

module.exports.get = function (cpid) {
    return connected_cps[cpid];
}

module.exports.put = function (cpid, cp) {
    connected_cps[cpid] = cp;
}

module.exports.delete = function (cpid) {
    if (connected_cps[cpid]) {
        delete connected_cps[cpid];
    }
}
