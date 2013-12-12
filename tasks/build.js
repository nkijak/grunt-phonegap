(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  module.exports.Build = (function() {
    Build.prototype.copy = require('directory-copy');

    Build.prototype.cp = require('cp');

    Build.prototype.path = require('path');

    Build.prototype.exec = require('child_process').exec;

    Build.prototype.phonegapCmd = require('./phonegapCmd').cmd;

    function Build(grunt, config) {
      this.grunt = grunt;
      this.config = config;
      this._fixAndroidVersionCode = __bind(this._fixAndroidVersionCode, this);
      this.buildIcons = __bind(this.buildIcons, this);
      this.buildPlatform = __bind(this.buildPlatform, this);
      this.postProcessPlatform = __bind(this.postProcessPlatform, this);
      this.addPlugin = __bind(this.addPlugin, this);
      this.compileConfig = __bind(this.compileConfig, this);
      this.cloneRoot = __bind(this.cloneRoot, this);
      this.cloneCordova = __bind(this.cloneCordova, this);
      this.file = this.grunt.file;
      this.log = this.grunt.log;
      this.warn = this.grunt.warn;
      this.fatal = this.grunt.fatal;
    }

    Build.prototype.clean = function(path) {
      if (path == null) {
        path = this.config.path;
      }
      if (this.file.exists(path)) {
        this.file["delete"](path);
      }
      return this;
    };

    Build.prototype.buildTree = function() {
      var path;
      path = this.config.path;
      this.file.mkdir(this.path.join(path, 'plugins'));
      this.file.mkdir(this.path.join(path, 'platforms'));
      this.file.mkdir(this.path.join(path, 'merges', 'android'));
      this.file.mkdir(this.path.join(path, 'www'));
      this.file.mkdir(this.path.join(path, '.cordova'));
      return this;
    };

    Build.prototype.cloneCordova = function(fn) {
      var _this = this;
      return this.copy({
        src: this.config.cordova,
        dest: this.path.join(this.config.path, '.cordova')
      }, function(err) {
        if (err) {
          _this.warn(err);
        }
        if (fn) {
          return fn(err);
        }
      });
    };

    Build.prototype.cloneRoot = function(fn) {
      var _this = this;
      return this.copy({
        src: this.config.root,
        dest: this.path.join(this.config.path, 'www')
      }, function(err) {
        if (err) {
          _this.warn(err);
        }
        if (fn) {
          return fn(err);
        }
      });
    };

    Build.prototype.compileConfig = function(fn) {
      var compiled, dest, template;
      dest = this.path.join(this.config.path, 'www', 'config.xml');
      if (this.grunt.util.kindOf(this.config.config) === 'string') {
        this.log.writeln("Copying static " + this.config.config);
        return this.cp(this.config.config, dest, function() {
          return fn();
        });
      } else {
        this.log.writeln("Compiling template " + this.config.config.template);
        template = this.grunt.file.read(this.config.config.template);
        compiled = this.grunt.template.process(template, {
          data: this.config.config.data
        });
        this.grunt.file.write(dest, compiled);
        return fn();
      }
    };

    Build.prototype.addPlugin = function(plugin, fn) {
      var cmd, proc,
        _this = this;
      cmd = "" + this.phonegapCmd + " plugin add " + plugin + " " + (this._setVerbosity());
      console.log("Running: [" + cmd + "]");
      proc = this.exec(cmd, {
        cwd: this.config.path,
        maxBuffer: this.config.maxBuffer * 1024
      }, function(err, stdout, stderr) {
        if (err) {
          _this.fatal(err);
        }
        if (fn) {
          return fn(err);
        }
      });
      proc.stdout.on('data', function(out) {
        return _this.log.write(out);
      });
      return proc.stderr.on('data', function(err) {
        return _this.fatal(err);
      });
    };

    Build.prototype.postProcessPlatform = function(platform, fn) {
      switch (platform) {
        case 'android':
          this._fixAndroidVersionCode();
      }
      if (fn) {
        return fn();
      }
    };

    Build.prototype.buildPlatform = function(platform, fn) {
      var childProcess, cmd,
        _this = this;
      cmd = "" + this.phonegapCmd + " build " + platform + " " + (this._setVerbosity());
      childProcess = this.exec(cmd, {
        cwd: this.config.path,
        maxBuffer: this.config.maxBuffer * 1024
      }, function(err, stdout, stderr) {
        if (err) {
          _this.fatal(err);
        }
        if (fn) {
          return fn(err);
        }
      });
      childProcess.stdout.on('data', function(out) {
        return _this.log.write(out);
      });
      return childProcess.stderr.on('data', function(err) {
        return _this.fatal(err);
      });
    };

    Build.prototype.buildIcons = function(platform, fn) {
      if (this.config.icons) {
        switch (platform) {
          case 'android':
            this.buildAndroidIcons(this.config.icons);
            break;
          default:
            this.warn("You have set `phonegap.config.icons`, but " + platform + " does not support it. Skipped...");
        }
      } else {
        this.log.writeln("No `phonegap.config.icons` specified. Skipped.");
      }
      if (fn) {
        return fn();
      }
    };

    Build.prototype.buildAndroidIcons = function(icons) {
      var best, res;
      res = this.path.join(this.config.path, 'platforms', 'android', 'res');
      best = null;
      if (icons['ldpi']) {
        best = icons['ldpi'];
        this.file.copy(icons['ldpi'], this.path.join(res, 'drawable-ldpi', 'icon.png'), {
          encoding: null
        });
      }
      if (icons['mdpi']) {
        best = icons['mdpi'];
        this.file.copy(icons['mdpi'], this.path.join(res, 'drawable-mdpi', 'icon.png'), {
          encoding: null
        });
      }
      if (icons['hdpi']) {
        best = icons['hdpi'];
        this.file.copy(icons['hdpi'], this.path.join(res, 'drawable-hdpi', 'icon.png'), {
          encoding: null
        });
      }
      if (icons['xhdpi']) {
        best = icons['xhdpi'];
        this.file.copy(icons['xhdpi'], this.path.join(res, 'drawable-xhdpi', 'icon.png'), {
          encoding: null
        });
      }
      if (best) {
        return this.file.copy(best, this.path.join(res, 'drawable', 'icon.png'), {
          encoding: null
        });
      }
    };

    Build.prototype._setVerbosity = function() {
      if (this.config.verbose) {
        return '-V';
      } else {
        return '';
      }
    };

    Build.prototype._fixAndroidVersionCode = function() {
      var data, doc, dom, manifest, manifestPath, versionCode;
      dom = require('xmldom').DOMParser;
      data = this.config.versionCode;
      versionCode = this.grunt.util.kindOf(data) === 'function' ? data() : data;
      manifestPath = this.path.join(this.config.path, 'platforms', 'android', 'AndroidManifest.xml');
      manifest = this.grunt.file.read(manifestPath);
      doc = new dom().parseFromString(manifest, 'text/xml');
      doc.getElementsByTagName('manifest')[0].setAttribute('android:versionCode', versionCode);
      return this.grunt.file.write(manifestPath, doc);
    };

    return Build;

  })();

}).call(this);
