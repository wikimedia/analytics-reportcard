require = (function(){
    var root = this
    ,   __require = root.require
    ,   req_obj   = root.require || {}
    ;
    
    __require = function (file, cwd) {
        var resolved = require.resolve ? require.resolve(file, cwd || '/') : file;
        var mod = require.modules[resolved];
        if (!mod) throw new Error(
            'Failed to resolve module ' + file + ', tried ' + resolved
        );
        if (!mod.exports) mod();
        // Always reference exports so recursive loads don't loop
        var res = (mod.module || {}).exports || mod._cached || mod.exports;
        return res;
    }
    
    for (var k in req_obj) {
        __require[k] = req_obj[k];
    }
    
    __require.modules = req_obj.modules || {};
    __require.cache   = req_obj.cache   || {};
    return __require;
})();

require.install = function(id, module, setup){
    if ( !id )
        throw new Error('No module ID specified: id='+id+'!');
    
    id = ''+id;
    if ( require.modules.hasOwnProperty(id) )
        throw new Error('Module "'+id+'" already exists!');
    
    // backwards compat
    if ( typeof module === 'function' )
        setup = module;
    
    module = { 'id': id };
    
    var exports = module.exports = {}
    ,   installer
    ;
    installer = function(){
        installer.exports = exports;
        if (setup) setup.call(exports, require, exports, module);
        installer.exports = installer._cached = require.cache[id] = module.exports;
        return module.exports;
    };
    
    installer.id = id;
    installer.module = module;
    installer.setup = setup;
    
    require.modules[id] = installer;
    return module;
};

